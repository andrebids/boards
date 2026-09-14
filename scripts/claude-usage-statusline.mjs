import { spawn } from "node:child_process";
import { mkdir, open, rename, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Claude Code runs this as its `statusLine` command and passes the documented session JSON on
// stdin: https://code.claude.com/docs/en/statusline. Only `rate_limits` is persisted locally.
const PUBLISH_THROTTLE_MS = 60_000;
const MAX_LOG_BYTES = 1024 * 1024;
const STDIN_TIMEOUT_MS = 2_000;
const BRIDGE_SCRIPT = fileURLToPath(
  new URL("./claude-usage-bridge.mjs", import.meta.url),
);

export const getUsageDirectory = (env = process.env) =>
  path.join(
    env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"),
    "planka-usage",
  );

const extractWindow = (window) => {
  const usedPercent = window?.used_percentage;
  const resetsAt = window?.resets_at;

  if (
    !Number.isFinite(usedPercent) ||
    usedPercent < 0 ||
    usedPercent > 100 ||
    !Number.isSafeInteger(resetsAt) ||
    resetsAt <= 0
  ) {
    return null;
  }

  return { usedPercent, resetsAt };
};

export const extractRateLimits = (input, capturedAt = new Date()) => {
  const fiveHour = extractWindow(input?.rate_limits?.five_hour);
  const sevenDay = extractWindow(input?.rate_limits?.seven_day);

  if (!fiveHour && !sevenDay) {
    return null;
  }

  const version = input?.version;
  return {
    fiveHour,
    sevenDay,
    capturedAt: capturedAt.toISOString(),
    ...(typeof version === "string" && /^[\w.+-]{1,40}$/.test(version)
      ? { claudeCodeVersion: version }
      : {}),
  };
};

const formatPercent = (window) => `${Math.round(window.usedPercent)}%`;

export const formatStatusLine = (input) => {
  const model =
    typeof input?.model?.display_name === "string"
      ? input.model.display_name
      : "Claude";
  const rateLimits = extractRateLimits(input);
  const parts = [model];

  if (rateLimits?.fiveHour) {
    parts.push(`5h ${formatPercent(rateLimits.fiveHour)}`);
  }
  if (rateLimits?.sevenDay) {
    parts.push(`7d ${formatPercent(rateLimits.sevenDay)}`);
  }

  return parts.join(" · ");
};

const readStdin = () =>
  new Promise((resolve) => {
    let data = "";
    const timeoutId = setTimeout(() => resolve(data), STDIN_TIMEOUT_MS);

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timeoutId);
      resolve(data);
    });
  });

export const writeRateLimitsSnapshot = async (usageDirectory, rateLimits) => {
  await mkdir(usageDirectory, { recursive: true });
  const snapshotFile = path.join(usageDirectory, "rate-limits.json");
  const temporaryFile = `${snapshotFile}.${process.pid}.tmp`;

  await writeFile(temporaryFile, `${JSON.stringify(rateLimits, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryFile, snapshotFile);
};

// Publishing is opt-in through CLAUDE_USAGE_PLANKA_URL so a generic PLANKA_URL never receives
// snapshots just because Claude Code rendered its status line.
const hasBridgeConfig = (env) =>
  Boolean(
    env.CLAUDE_USAGE_PLANKA_URL &&
      (env.CLAUDE_USAGE_BRIDGE_TOKEN || env.CODEX_USAGE_BRIDGE_TOKEN),
  );

// Starts a detached one-shot bridge at most once per minute; the status line never waits for it.
const publishInBackground = async (usageDirectory, nowMs = Date.now()) => {
  const markerFile = path.join(usageDirectory, "last-publish-attempt");
  const markerStats = await stat(markerFile).catch(() => null);
  if (markerStats && nowMs - markerStats.mtimeMs < PUBLISH_THROTTLE_MS) {
    return;
  }

  await writeFile(markerFile, "");
  await utimes(markerFile, nowMs / 1000, nowMs / 1000);

  const logFile = path.join(usageDirectory, "bridge.log");
  const logStats = await stat(logFile).catch(() => null);
  if (logStats && logStats.size > MAX_LOG_BYTES) {
    await rename(logFile, path.join(usageDirectory, "bridge.previous.log"));
  }

  const log = await open(logFile, "a");
  try {
    spawn(process.execPath, [BRIDGE_SCRIPT, "--once"], {
      detached: true,
      stdio: ["ignore", log.fd, log.fd],
      windowsHide: true,
    }).unref();
  } finally {
    await log.close();
  }
};

const runStatusLine = async () => {
  let input = null;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    // An unreadable payload still renders a status line; nothing is persisted.
  }

  process.stdout.write(`${formatStatusLine(input)}\n`);

  try {
    const usageDirectory = getUsageDirectory();
    const rateLimits = extractRateLimits(input);
    if (rateLimits) {
      await writeRateLimitsSnapshot(usageDirectory, rateLimits);
    }

    if (hasBridgeConfig(process.env)) {
      await publishInBackground(usageDirectory);
    }
  } catch {
    // The status line must never break Claude Code; the bridge log records publish failures.
  }
};

const isEntryPoint =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  runStatusLine();
}
