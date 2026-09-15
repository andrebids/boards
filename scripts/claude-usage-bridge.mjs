import { createReadStream } from "node:fs";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { pathToFileURL } from "node:url";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_DAILY_USAGE_BUCKETS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const BRIDGE_PATH = "api/dashboard/claude-usage";
const OAUTH_TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const TOKEN_FIELDS = [
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
];

const isLocalHost = (hostname) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname === "[::1]";

export const getClaudeConfigDirectory = (env = process.env) =>
  env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");

export const createPlankaUsageUrl = (plankaUrl) => {
  const endpoint = new URL(plankaUrl);
  if (
    endpoint.protocol !== "https:" &&
    !(endpoint.protocol === "http:" && isLocalHost(endpoint.hostname))
  ) {
    throw new Error("PLANKA_URL must use HTTPS unless it targets localhost");
  }

  endpoint.pathname = `${endpoint.pathname.replace(/\/?$/, "/")}${BRIDGE_PATH}`;
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint;
};

const isValidWindow = (window) =>
  window === null ||
  (Number.isFinite(window?.usedPercent) &&
    window.usedPercent >= 0 &&
    window.usedPercent <= 100 &&
    Number.isSafeInteger(window.resetsAt) &&
    window.resetsAt > 0);

// Explicit opt-in: this private endpoint can change without notice. Credentials never leave
// the local machine except for the access token sent to this fixed Anthropic HTTPS origin.
export const fetchOAuthRateLimits = async (configDirectory, fetchImpl = fetch) => {
  let credentials;
  try {
    credentials = JSON.parse(
      await readFile(path.join(configDirectory, ".credentials.json"), "utf8"),
    );
  } catch {
    throw new Error("Claude credentials unavailable; run claude auth login");
  }
  const oauth = credentials?.claudeAiOauth;
  let accessToken = oauth?.accessToken;
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new Error("Claude access token unavailable; run claude auth login");
  }

  const refreshCredentials = async () => {
    if (typeof oauth?.refreshToken !== "string" || !oauth.refreshToken.trim()) {
      throw new Error("Claude refresh token unavailable; run claude auth login");
    }
    const response = await fetchImpl(OAUTH_TOKEN_URL, {
      body: new URLSearchParams({
        client_id: process.env.CLAUDE_CODE_OAUTH_CLIENT_ID || OAUTH_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: oauth.refreshToken,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Claude OAuth refresh failed (HTTP ${response.status})`);
    }
    const refreshed = await response.json();
    if (typeof refreshed.access_token !== "string" || !refreshed.access_token) {
      throw new Error("Claude OAuth refresh response is invalid");
    }
    const nextOauth = {
      ...oauth,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
      ...(typeof refreshed.refresh_token === "string"
        ? { refreshToken: refreshed.refresh_token }
        : {}),
      ...(Number.isFinite(refreshed.refresh_token_expires_in)
        ? {
            refreshTokenExpiresAt:
              Date.now() + Number(refreshed.refresh_token_expires_in) * 1000,
          }
        : {}),
    };
    const nextCredentials = { ...credentials, claudeAiOauth: nextOauth };
    const credentialsFile = path.join(configDirectory, ".credentials.json");
    const temporaryFile = `${credentialsFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(nextCredentials, null, 2)}\n`);
    await rename(temporaryFile, credentialsFile);
    accessToken = nextOauth.accessToken;
    return nextOauth;
  };

  if (Number.isFinite(oauth.expiresAt) && oauth.expiresAt <= Date.now() + 60_000) {
    await refreshCredentials();
  }

  const requestUsage = () =>
    fetchImpl("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  let response;
  try { response = await requestUsage(); } catch {
    throw new Error("Claude usage request failed (network or timeout)");
  }
  if (response.status === 401) {
    await refreshCredentials();
    try { response = await requestUsage(); } catch {
      throw new Error("Claude usage request failed (network or timeout)");
    }
  }
  if (!response.ok) {
    throw new Error(
      `Claude usage request failed (HTTP ${response.status})${
        response.status === 401 ? "; run claude auth login" : ""
      }`,
    );
  }

  try {
    const usage = await response.json();
    const normalize = (window) => {
      if (window == null || window.resets_at == null) return null;
      const result = {
        usedPercent: window.utilization,
        resetsAt: Math.floor(Date.parse(window.resets_at) / 1000),
      };
      if (!isValidWindow(result)) throw new Error();
      return result;
    };
    const fiveHour = normalize(usage.five_hour);
    const sevenDay = normalize(usage.seven_day);
    if (!fiveHour && !sevenDay) throw new Error();
    return { fiveHour, sevenDay, capturedAt: new Date().toISOString() };
  } catch {
    throw new Error("Claude usage response has an unsupported format");
  }
};

// Reads the snapshot written by claude-usage-statusline.mjs from Claude Code `rate_limits`.
export const readRateLimitsSnapshot = async (usageDirectory) => {
  let snapshot;
  try {
    snapshot = JSON.parse(
      await readFile(path.join(usageDirectory, "rate-limits.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw new Error("The Claude rate limit snapshot is unreadable");
  }

  const fiveHour = snapshot?.fiveHour ?? null;
  const sevenDay = snapshot?.sevenDay ?? null;
  if (
    !isValidWindow(fiveHour) ||
    !isValidWindow(sevenDay) ||
    (!fiveHour && !sevenDay) ||
    !Number.isFinite(Date.parse(snapshot.capturedAt))
  ) {
    throw new Error("The Claude rate limit snapshot is invalid");
  }

  return {
    fiveHour,
    sevenDay,
    capturedAt: snapshot.capturedAt,
    ...(typeof snapshot.claudeCodeVersion === "string"
      ? { claudeCodeVersion: snapshot.claudeCodeVersion }
      : {}),
  };
};

const toLocalDateKey = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const shiftDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toLocalDateKey(new Date(year, month - 1, day + days));
};

// Transcript entries are internal to Claude Code, so unknown shapes are skipped instead of guessed.
export const getTranscriptEntryUsage = (entry) => {
  const message = entry?.message;
  const usage = message?.usage;
  const timestamp = Date.parse(entry?.timestamp);

  if (
    entry?.type !== "assistant" ||
    !usage ||
    typeof usage !== "object" ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  const tokens = TOKEN_FIELDS.reduce(
    (sum, field) =>
      sum +
      (Number.isSafeInteger(usage[field]) && usage[field] > 0
        ? usage[field]
        : 0),
    0,
  );
  const id = message.id || entry.requestId;
  if (!id || tokens <= 0) {
    return null;
  }

  return {
    dateKey: toLocalDateKey(new Date(timestamp)),
    id: String(id),
    tokens,
  };
};

const findTranscriptFiles = async (directory, minimumModifiedMs) => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return findTranscriptFiles(entryPath, minimumModifiedMs);
      }

      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        return [];
      }

      const fileStats = await stat(entryPath).catch(() => null);
      return fileStats && fileStats.mtimeMs >= minimumModifiedMs
        ? [entryPath]
        : [];
    }),
  );

  return files.flat();
};

export const summarizeDailyTokens = (tokensByDate, now = new Date()) => {
  const dailyUsageBuckets = [...tokensByDate.entries()]
    .filter(([, tokens]) => tokens > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-MAX_DAILY_USAGE_BUCKETS)
    .map(([startDate, tokens]) => ({ startDate, tokens }));
  const activeDates = new Set(
    dailyUsageBuckets.map(({ startDate }) => startDate),
  );

  let longestStreakDays = 0;
  let runningStreakDays = 0;
  let previousDate = null;
  for (const { startDate } of dailyUsageBuckets) {
    runningStreakDays =
      previousDate === shiftDateKey(startDate, -1) ? runningStreakDays + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, runningStreakDays);
    previousDate = startDate;
  }

  // A streak stays current until a full day passes without activity.
  let currentStreakDays = 0;
  let cursor = toLocalDateKey(now);
  if (!activeDates.has(cursor)) {
    cursor = shiftDateKey(cursor, -1);
  }
  while (activeDates.has(cursor)) {
    currentStreakDays += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return {
    summary: {
      totalTokens: dailyUsageBuckets.reduce(
        (sum, { tokens }) => sum + tokens,
        0,
      ),
      peakDailyTokens: dailyUsageBuckets.reduce(
        (peak, { tokens }) => Math.max(peak, tokens),
        0,
      ),
      currentStreakDays,
      longestStreakDays,
    },
    dailyUsageBuckets,
  };
};

export const collectTokenActivity = async (
  projectsDirectory,
  now = new Date(),
) => {
  const minimumModifiedMs = now.getTime() - MAX_DAILY_USAGE_BUCKETS * DAY_MS;
  const files = await findTranscriptFiles(projectsDirectory, minimumModifiedMs);
  const seenMessageIds = new Set();
  const tokensByDate = new Map();

  for (const file of files) {
    const lines = readline.createInterface({
      crlfDelay: Infinity,
      input: createReadStream(file, { encoding: "utf8" }),
    });

    for await (const line of lines) {
      if (!line.includes('"usage"')) {
        continue;
      }

      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      // Claude Code writes one entry per content block, each repeating the same message usage.
      const usage = getTranscriptEntryUsage(entry);
      if (usage && !seenMessageIds.has(usage.id)) {
        seenMessageIds.add(usage.id);
        tokensByDate.set(
          usage.dateKey,
          (tokensByDate.get(usage.dateKey) || 0) + usage.tokens,
        );
      }
    }
  }

  return {
    ...summarizeDailyTokens(tokensByDate, now),
    capturedAt: now.toISOString(),
  };
};

const publishUsage = async (endpoint, token, usage) => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(usage),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Planka rejected the Claude usage snapshot (${response.status})`,
    );
  }
};

const runBridge = async () => {
  const token =
    process.env.CLAUDE_USAGE_BRIDGE_TOKEN ||
    process.env.CODEX_USAGE_BRIDGE_TOKEN;
  if (!token) {
    throw new Error(
      "CLAUDE_USAGE_BRIDGE_TOKEN or CODEX_USAGE_BRIDGE_TOKEN is required",
    );
  }

  const plankaUrl =
    process.env.CLAUDE_USAGE_PLANKA_URL || process.env.PLANKA_URL;
  if (!plankaUrl) {
    throw new Error("CLAUDE_USAGE_PLANKA_URL or PLANKA_URL is required");
  }

  const endpoint = createPlankaUsageUrl(plankaUrl);
  const configDirectory = getClaudeConfigDirectory();
  const usageDirectory = path.join(configDirectory, "planka-usage");
  const bridgeConfig = await readFile(path.join(usageDirectory, "config.json"), "utf8")
    .then(JSON.parse)
    .catch((error) => {
      if (error.code === "ENOENT") return {};
      throw new Error("Claude usage bridge config is unreadable");
    });
  const rateLimits = bridgeConfig.oauthEnabled === true
    ? await fetchOAuthRateLimits(configDirectory)
    : await readRateLimitsSnapshot(usageDirectory);
  const tokenActivity = await collectTokenActivity(
    path.join(configDirectory, "projects"),
  );

  await publishUsage(endpoint, token, { rateLimits, tokenActivity });
  console.log(
    `${new Date().toISOString()} Claude usage snapshot sent (${
      rateLimits
        ? `limits captured ${rateLimits.capturedAt}`
        : "no rate limits yet"
    }, ${tokenActivity.dailyUsageBuckets.length} daily buckets).`,
  );
};

const isEntryPoint =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  runBridge().catch((error) => {
    console.error(
      `${new Date().toISOString()} Claude usage snapshot was not sent: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
