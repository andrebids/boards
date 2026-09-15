import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectTokenActivity,
  createPlankaUsageUrl,
  fetchOAuthRateLimits,
  getTranscriptEntryUsage,
  readRateLimitsSnapshot,
  summarizeDailyTokens,
} from "./claude-usage-bridge.mjs";
import {
  extractRateLimits,
  formatStatusLine,
  writeRateLimitsSnapshot,
} from "./claude-usage-statusline.mjs";

const CAPTURED_AT = new Date("2026-09-14T11:00:00.000Z");

test("OAuth usage reads fresh limits and fails safely on expired login or invalid data", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claude-oauth-test-"));
  try {
    await writeFile(path.join(directory, ".credentials.json"), JSON.stringify({
      claudeAiOauth: { accessToken: "test-only-token" },
    }));
    const result = await fetchOAuthRateLimits(directory, async (url, options) => {
      assert.equal(url, "https://api.anthropic.com/api/oauth/usage");
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Authorization, "Bearer test-only-token");
      return { ok: true, json: async () => ({
        five_hour: { utilization: 0, resets_at: null },
        seven_day: { utilization: 4, resets_at: "2026-09-20T07:00:00+01:00" },
      }) };
    });
    assert.equal(result.sevenDay.usedPercent, 4);
    assert.equal(result.fiveHour, null);
    assert.equal(result.sevenDay.resetsAt, 1789884000);
    assert.ok(Date.now() - Date.parse(result.capturedAt) < 5000);
    await assert.rejects(fetchOAuthRateLimits(directory, async () => ({
      ok: false, status: 401,
    })), /refresh token unavailable/);
    await assert.rejects(fetchOAuthRateLimits(directory, async () => ({
      ok: true, json: async () => ({ seven_day: { utilization: 104, resets_at: "bad" } }),
    })), /unsupported format/);
    await assert.rejects(fetchOAuthRateLimits(directory, async () => {
      throw new Error("test-only-token");
    }), (error) => !error.message.includes("test-only-token"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("OAuth usage refreshes an expired access token before reading limits", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claude-oauth-refresh-"));
  const calls = [];
  try {
    await writeFile(path.join(directory, ".credentials.json"), JSON.stringify({
      claudeAiOauth: {
        accessToken: "expired-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() - 1,
      },
    }));
    const result = await fetchOAuthRateLimits(directory, async (url, options) => {
      calls.push({ url, options });
      if (url.includes("/v1/oauth/token")) {
        return { ok: true, json: async () => ({ access_token: "fresh-token", expires_in: 3600 }) };
      }
      return { ok: true, json: async () => ({
        five_hour: { utilization: 1, resets_at: "2026-09-14T21:10:00+01:00" },
        seven_day: { utilization: 4, resets_at: "2026-09-20T07:00:00+01:00" },
      }) };
    });
    assert.equal(result.sevenDay.usedPercent, 4);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /platform\.claude\.com\/v1\/oauth\/token/);
    assert.equal(calls[1].options.headers.Authorization, "Bearer fresh-token");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("status line keeps only documented Claude.ai subscription windows", () => {
  const input = {
    version: "2.1.270",
    model: { display_name: "Opus" },
    cost: { total_cost_usd: 1.5 },
    rate_limits: {
      five_hour: { used_percentage: 23.5, resets_at: 1789750800 },
      seven_day: { used_percentage: 41.2, resets_at: 1790200000 },
      spend_limit: { used_percentage: 120, resets_at: 1790200000 },
    },
  };

  assert.deepEqual(extractRateLimits(input, CAPTURED_AT), {
    fiveHour: { usedPercent: 23.5, resetsAt: 1789750800 },
    sevenDay: { usedPercent: 41.2, resetsAt: 1790200000 },
    capturedAt: "2026-09-14T11:00:00.000Z",
    claudeCodeVersion: "2.1.270",
  });
  assert.equal(formatStatusLine(input), "Opus · 5h 24% · 7d 41%");
});

test("status line ignores sessions without rate limits (API key or before first response)", () => {
  assert.equal(
    extractRateLimits({ model: { display_name: "Opus" } }, CAPTURED_AT),
    null,
  );
  assert.equal(
    extractRateLimits({
      rate_limits: { five_hour: { used_percentage: "20", resets_at: 1 } },
    }),
    null,
  );
  assert.equal(formatStatusLine(null), "Claude");
});

test("bridge reads the snapshot written by the status line", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claude-usage-"));
  try {
    assert.equal(await readRateLimitsSnapshot(directory), null);

    const snapshot = extractRateLimits(
      {
        rate_limits: {
          seven_day: { used_percentage: 10, resets_at: 1790200000 },
        },
      },
      CAPTURED_AT,
    );
    await writeRateLimitsSnapshot(directory, snapshot);
    assert.deepEqual(await readRateLimitsSnapshot(directory), snapshot);

    await writeFile(
      path.join(directory, "rate-limits.json"),
      '{"fiveHour":{"usedPercent":500}}',
    );
    await assert.rejects(readRateLimitsSnapshot(directory), /invalid/);
    assert.match(
      await readFile(path.join(directory, "rate-limits.json"), "utf8"),
      /500/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("token activity counts each assistant message once", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "claude-projects-"));
  const usage = {
    input_tokens: 10,
    output_tokens: 5,
    cache_creation_input_tokens: 100,
    cache_read_input_tokens: 1000,
  };
  const entry = (id, timestamp) =>
    JSON.stringify({ type: "assistant", timestamp, message: { id, usage } });

  try {
    await mkdir(path.join(directory, "project", "subagents"), {
      recursive: true,
    });
    await writeFile(
      path.join(directory, "project", "session.jsonl"),
      [
        entry("msg_1", "2026-09-13T12:00:00.000Z"),
        entry("msg_1", "2026-09-13T12:00:01.000Z"),
        '{not json "usage"',
        JSON.stringify({
          type: "user",
          timestamp: "2026-09-13T12:00:00.000Z",
          message: { usage },
        }),
      ].join("\n"),
    );
    await writeFile(
      path.join(directory, "project", "subagents", "agent.jsonl"),
      entry("msg_2", "2026-09-14T12:00:00.000Z"),
    );

    const activity = await collectTokenActivity(
      directory,
      new Date("2026-09-14T13:00:00.000Z"),
    );
    assert.deepEqual(activity.summary, {
      totalTokens: 2230,
      peakDailyTokens: 1115,
      currentStreakDays: 2,
      longestStreakDays: 2,
    });
    assert.equal(activity.dailyUsageBuckets.length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("streaks tolerate a day without activity only for the current day", () => {
  const now = new Date(2026, 8, 14, 12);
  const activity = summarizeDailyTokens(
    new Map([
      ["2026-09-01", 1],
      ["2026-09-02", 1],
      ["2026-09-03", 1],
      ["2026-09-12", 2],
      ["2026-09-13", 3],
    ]),
    now,
  );

  assert.equal(activity.summary.currentStreakDays, 2);
  assert.equal(activity.summary.longestStreakDays, 3);
  assert.equal(activity.summary.peakDailyTokens, 3);
  assert.equal(
    getTranscriptEntryUsage({ type: "assistant", message: {} }),
    null,
  );
});

test("publishing requires HTTPS outside localhost", () => {
  assert.equal(
    createPlankaUsageUrl("http://localhost:3008").href,
    "http://localhost:3008/api/dashboard/claude-usage",
  );
  assert.throws(
    () => createPlankaUsageUrl("http://boards.example.pt"),
    /HTTPS/,
  );
});
