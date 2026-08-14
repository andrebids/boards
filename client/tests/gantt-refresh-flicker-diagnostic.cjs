const { chromium } = require('@playwright/test');
const fs = require('fs');
const { spawnSync } = require('child_process');

const API_URL = 'http://localhost:1337/api';

const request = async (path, { token, method = 'GET', body } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}`);
  return response.json();
};

const installPaintProbe = async (page) => {
  await page.addInitScript(() => {
    const startedAt = performance.now();
    const diagnostic = {
      running: true,
      frames: 0,
      whiteFrames: 0,
      firstWhiteFrame: null,
      transitions: [],
      lastSignature: null,
    };
    window.__ganttRefreshDiagnostic = diagnostic;

    const isBrightOpaqueColor = (value) => {
      const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
      if (!match) return false;
      const [, red, green, blue, alpha = '1'] = match;
      return Number(alpha) > 0.2 && [red, green, blue].every((channel) => Number(channel) >= 220);
    };

    const inspect = (source) => {
      if (!diagnostic.running) return;
      const root = document.querySelector('[data-gantt-color-scope]');
      if (root) {
        diagnostic.frames += 1;
        const targets = [
          root,
          ...root.querySelectorAll('.wx-grid, .wx-row, .wx-cell, [class*="grid"], [class*="cell"]'),
        ];
        const brightStyles = [];
        for (const element of targets) {
          const style = getComputedStyle(element);
          if (isBrightOpaqueColor(style.backgroundColor)) {
            brightStyles.push({
              className: element.className,
              property: 'backgroundColor',
              value: style.backgroundColor,
            });
          }
          for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
            const color = style[`border${side}Color`];
            const width = Number.parseFloat(style[`border${side}Width`]);
            const borderStyle = style[`border${side}Style`];
            if (width > 0 && borderStyle !== 'none' && isBrightOpaqueColor(color)) {
              brightStyles.push({
                className: element.className,
                property: `border${side}`,
                value: `${width}px ${borderStyle} ${color}`,
              });
            }
          }
        }

        const theme = root.querySelector('.wx-theme');
        const rootStyle = getComputedStyle(theme || root);
        const signature = JSON.stringify({
          themeClass: theme?.className || '',
          borderToken: rootStyle.getPropertyValue('--wx-gantt-border-color').trim(),
          brightCount: brightStyles.length,
        });
        if (signature !== diagnostic.lastSignature && diagnostic.transitions.length < 20) {
          diagnostic.transitions.push({
            at: Math.round(performance.now() - startedAt),
            ...JSON.parse(signature),
          });
          diagnostic.lastSignature = signature;
        }
        if (brightStyles.length > 0) {
          diagnostic.whiteFrames += 1;
          diagnostic.firstWhiteFrame ||= {
            at: Math.round(performance.now() - startedAt),
            source,
            examples: brightStyles.slice(0, 5),
          };
        }
      }
    };

    const inspectFrame = () => {
      inspect('animation-frame');
      requestAnimationFrame(inspectFrame);
    };
    const observer = new MutationObserver(() => inspect('mutation'));
    observer.observe(document, { childList: true, subtree: true, attributes: true });
    diagnostic.observer = observer;
    requestAnimationFrame(inspectFrame);
  });
};

(async () => {
  let browser;
  let token;
  let projectId;

  try {
    ({ item: token } = await request('/access-tokens', {
      method: 'POST',
      body: {
        emailOrUsername: process.env.GANTT_TEST_USER,
        password: process.env.GANTT_TEST_PASSWORD,
      },
    }));
    const projectBody = await request('/projects', {
      token,
      method: 'POST',
      body: { type: 'private', name: 'Gantt refresh flicker diagnostic' },
    });
    projectId = projectBody.item.id;
    const planBody = await request(`/projects/${projectId}/gantt-plan`, {
      token,
      method: 'POST',
      body: {},
    });
    await request(`/gantt-plans/${planBody.item.id}/items`, {
      token,
      method: 'POST',
      body: {
        task: 'Refresh probe',
        status: 'inProgress',
        startDate: '2026-08-10',
        endDate: '2026-08-14',
        expectedDurationDays: 5,
        assigneeUserIds: [],
      },
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([
      { name: 'accessToken', value: token, url: 'http://localhost:3008' },
      { name: 'accessTokenVersion', value: '1', url: 'http://localhost:3008' },
    ]);
    const page = await context.newPage();
    await installPaintProbe(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const screencastFrames = [];
    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      screencastFrames.push(Buffer.from(data, 'base64'));
      await cdp.send('Page.screencastFrameAck', { sessionId });
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

    const url = `http://localhost:3008/projects/${projectId}/gantt`;
    const results = [];
    for (let attempt = 0; attempt < 1; attempt += 1) {
      if (attempt === 0) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      }
      await page.locator('.wx-bar').first().waitFor({ state: 'visible', timeout: 90000 });
      await page.waitForTimeout(600);
      results.push(
        await page.evaluate(() => {
          const diagnostic = window.__ganttRefreshDiagnostic;
          diagnostic.running = false;
          diagnostic.observer.disconnect();
          return {
            frames: diagnostic.frames,
            whiteFrames: diagnostic.whiteFrames,
            firstWhiteFrame: diagnostic.firstWhiteFrame,
            transitions: diagnostic.transitions,
          };
        }),
      );
      if (attempt === 0) {
        await cdp.send('Page.stopScreencast');
      }
    }

    const framesDirectory = fs.mkdtempSync('/tmp/gantt-refresh-frames-');
    screencastFrames.forEach((frame, index) => {
      fs.writeFileSync(`${framesDirectory}/${String(index).padStart(4, '0')}.png`, frame);
    });
    const paintSamples = screencastFrames.slice(-20).map((frame, relativeIndex) => {
      const frameIndex = screencastFrames.length - 20 + relativeIndex;
      const framePath = `${framesDirectory}/${String(frameIndex).padStart(4, '0')}.png`;
      const decoded = spawnSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          framePath,
          '-vf',
          'crop=500:60:570:285,format=rgb24',
          '-frames:v',
          '1',
          '-f',
          'rawvideo',
          '-',
        ],
        { maxBuffer: 500 * 60 * 3 + 1024 },
      );
      if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
      let brightNeutralPixels = 0;
      for (let offset = 0; offset < decoded.stdout.length; offset += 3) {
        const red = decoded.stdout[offset];
        const green = decoded.stdout[offset + 1];
        const blue = decoded.stdout[offset + 2];
        if (
          red >= 220 &&
          red <= 235 &&
          Math.abs(red - green) <= 2 &&
          Math.abs(red - blue) <= 2
        ) {
          brightNeutralPixels += 1;
        }
      }
      return { frameIndex, brightNeutralPixels };
    });
    const peakPaint = paintSamples.reduce((peak, sample) =>
      sample.brightNeutralPixels > peak.brightNeutralPixels ? sample : peak,
    );
    process.stdout.write(
      `${JSON.stringify(
        { framesDirectory, screencastFrames: screencastFrames.length, peakPaint, results },
        null,
        2,
      )}\n`,
    );
    if (peakPaint.brightNeutralPixels > 250) {
      throw new Error(
        `Gantt refresh flicker reproduced: frame ${peakPaint.frameIndex} painted ${peakPaint.brightNeutralPixels} bright neutral pixels in the timeline grid`,
      );
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (token && projectId) {
      await request(`/projects/${projectId}`, { token, method: 'DELETE' }).catch(() => {});
    }
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
