import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const APP_SERVER_TIMEOUT_MS = 15_000;
const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 60 * 60 * 1000;
const BRIDGE_PATH = 'api/dashboard/codex-usage';

const isLocalHost = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  hostname === '[::1]';

const assertUsageValue = (condition, message) => {
  if (!condition) {
    throw new Error(`Codex usage response ${message}`);
  }
};

export const extractWeeklyUsage = (response) => {
  const limits = response?.rateLimitsByLimitId?.codex || response?.rateLimits;
  const primary = limits?.primary;

  assertUsageValue(primary && typeof primary === 'object', 'does not contain a primary limit');
  assertUsageValue(
    Number.isFinite(primary.usedPercent) && primary.usedPercent >= 0 && primary.usedPercent <= 100,
    'has an invalid usedPercent',
  );
  assertUsageValue(
    Number.isSafeInteger(primary.resetsAt) && primary.resetsAt > 0,
    'has an invalid resetsAt',
  );
  assertUsageValue(
    Number.isSafeInteger(primary.windowDurationMins) && primary.windowDurationMins > 0,
    'has an invalid windowDurationMins',
  );

  return {
    resetsAt: primary.resetsAt,
    usedPercent: primary.usedPercent,
    windowDurationMins: primary.windowDurationMins,
  };
};

export const createPlankaUsageUrl = (plankaUrl) => {
  const endpoint = new URL(plankaUrl);
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && isLocalHost(endpoint.hostname))) {
    throw new Error('PLANKA_URL must use HTTPS unless it targets localhost');
  }

  endpoint.pathname = `${endpoint.pathname.replace(/\/?$/, '/')}${BRIDGE_PATH}`;
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint;
};

const getIntervalMs = () => {
  const intervalMs = Number(process.env.CODEX_USAGE_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(intervalMs) || intervalMs < MIN_INTERVAL_MS || intervalMs > MAX_INTERVAL_MS) {
    throw new Error(
      `CODEX_USAGE_INTERVAL_MS must be between ${MIN_INTERVAL_MS} and ${MAX_INTERVAL_MS}`,
    );
  }

  return intervalMs;
};

const findCodexExecutable = async () => {
  if (process.env.CODEX_EXE) {
    if (!existsSync(process.env.CODEX_EXE)) {
      throw new Error('CODEX_EXE does not point to a Codex executable');
    }

    return process.env.CODEX_EXE;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error('CODEX_EXE is required outside a Windows Codex Desktop installation');
  }

  const codexBinRoot = path.join(localAppData, 'OpenAI', 'Codex', 'bin');
  const versions = await readdir(codexBinRoot, { withFileTypes: true });
  const candidates = await Promise.all(
    versions
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const executable = path.join(codexBinRoot, entry.name, 'codex.exe');
        const executableStats = await stat(executable).catch(() => null);

        return executableStats ? { executable, modifiedAt: executableStats.mtimeMs } : null;
      }),
  );
  const latest = candidates
    .filter(Boolean)
    .sort((left, right) => right.modifiedAt - left.modifiedAt)[0];

  if (!latest) {
    throw new Error('No Codex Desktop executable was found; set CODEX_EXE explicitly');
  }

  return latest.executable;
};

const readRateLimits = (codexExecutable) =>
  new Promise((resolve, reject) => {
    const appServer = spawn(codexExecutable, ['app-server', '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let buffer = '';
    let initialized = false;
    let isSettled = false;

    const finish = (error, value) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeoutId);
      appServer.kill();

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };
    const timeoutId = setTimeout(
      () => finish(new Error('Codex App Server did not answer within 15 seconds')),
      APP_SERVER_TIMEOUT_MS,
    );
    const send = (request) => appServer.stdin.write(`${JSON.stringify(request)}\n`);

    appServer.on('error', () => finish(new Error('Could not start the Codex App Server')));
    appServer.on('close', () => {
      if (!isSettled) {
        finish(new Error('Codex App Server closed before returning usage data'));
      }
    });
    appServer.stdout.on('data', (chunk) => {
      buffer += chunk.toString();

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (!line.trim()) {
          continue;
        }

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.id === 1 && !initialized) {
          initialized = true;
          send({ jsonrpc: '2.0', id: 2, method: 'account/rateLimits/read', params: null });
        } else if (message.id === 2) {
          if (message.error) {
            finish(new Error('Codex App Server rejected the rate-limit request'));
          } else {
            finish(null, message.result);
          }
        }
      }
    });

    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        capabilities: { experimentalApi: true },
        clientInfo: { name: 'planka-codex-usage-bridge', version: '1.0.0' },
      },
    });
  });

const publishUsage = async (endpoint, token, usage) => {
  const response = await fetch(endpoint, {
    body: JSON.stringify(usage),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(APP_SERVER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Planka rejected the Codex usage snapshot (${response.status})`);
  }
};

const runOnce = async ({ codexExecutable, endpoint, token }) => {
  const usage = extractWeeklyUsage(await readRateLimits(codexExecutable));
  await publishUsage(endpoint, token, usage);
  console.log(`Codex usage snapshot sent (${usage.usedPercent}%).`);
};

const runBridge = async () => {
  const token = process.env.CODEX_USAGE_BRIDGE_TOKEN;
  const plankaUrl = process.env.PLANKA_URL;

  if (!token) {
    throw new Error('CODEX_USAGE_BRIDGE_TOKEN is required');
  }

  if (!plankaUrl) {
    throw new Error('PLANKA_URL is required');
  }

  const config = {
    codexExecutable: await findCodexExecutable(),
    endpoint: createPlankaUsageUrl(plankaUrl),
    token,
  };
  const isOneShot = process.argv.includes('--once');
  const sync = async () => {
    try {
      await runOnce(config);
    } catch (error) {
      console.error(`Codex usage snapshot was not sent: ${error.message}`);
    }
  };

  await sync();
  if (isOneShot) {
    return;
  }

  const intervalId = setInterval(sync, getIntervalMs());
  process.once('SIGINT', () => {
    clearInterval(intervalId);
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    clearInterval(intervalId);
    process.exit(0);
  });
};

const isEntryPoint = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  runBridge().catch((error) => {
    console.error(`Codex usage bridge could not start: ${error.message}`);
    process.exitCode = 1;
  });
}
