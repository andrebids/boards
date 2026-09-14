import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { pathToFileURL } from "node:url";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_DAILY_USAGE_BUCKETS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const BRIDGE_PATH = "api/dashboard/claude-usage";
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
  const rateLimits = await readRateLimitsSnapshot(
    path.join(configDirectory, "planka-usage"),
  );
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
