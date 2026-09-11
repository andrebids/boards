// Use the local fixture printed by gantt-hierarchy-api.cjs with KEEP_GANTT_FIXTURE=1.
const { chromium, expect } = require('@playwright/test');

(async () => {
  if (!process.env.TEST_PROJECT) throw new Error('TEST_PROJECT must identify the disposable Gantt fixture');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let token = process.env.TEST_TOKEN;
    if (!token) {
      const response = await context.request.post('http://localhost:3008/api/access-tokens', {
        data: { emailOrUsername: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      });
      expect(response.ok()).toBeTruthy();
      token = (await response.json()).item;
    }
    await context.addCookies([
      { name: 'accessToken', value: token, url: 'http://localhost:3008' },
      { name: 'accessTokenVersion', value: '1', url: 'http://localhost:3008' },
    ]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://localhost:3008/projects/${process.env.TEST_PROJECT}/gantt`);
    const parent = page.getByRole('row').filter({ hasText: 'QA Prism' });
    const child = page.getByRole('row').filter({ hasText: 'QA Subtask' });
    await expect(child).toBeVisible();
    await expect(parent).toHaveAttribute('aria-expanded', 'true');
    await parent.locator('[data-action="open-task"]').click();
    await expect(child).toHaveCount(0);
    await page.getByTestId('gantt-zoom-month').click();
    await expect(parent).toHaveAttribute('aria-expanded', 'false');
    await parent.locator('[data-action="open-task"]').click();
    await expect(child).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'QA Parent without dates' })).toBeVisible();
    await parent.getByRole('gridcell').nth(1).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: /Add subtask|Adicionar subtarefa/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await child.getByRole('gridcell').nth(1).click();
    await expect(dialog.getByRole('button', { name: /Add subtask|Adicionar subtarefa/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(child).toBeVisible();
    expect(errors).toEqual([]);
    console.log('Gantt three-level browser smoke passed');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
