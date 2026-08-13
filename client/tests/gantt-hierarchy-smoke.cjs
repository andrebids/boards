const { chromium } = require('@playwright/test');

const waitForSite = async () => {
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch('http://localhost:3008/');
      if (response.ok) {
        return;
      }
    } catch {
      // The development server may be restarting; retry until it is ready.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
  /* eslint-enable no-await-in-loop */
  throw new Error('Development site did not become ready');
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await waitForSite();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies([
      { name: 'accessToken', value: process.env.TEST_TOKEN, url: 'http://localhost:3008' },
      { name: 'accessTokenVersion', value: '1', url: 'http://localhost:3008' },
    ]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));

    await page.goto(`http://localhost:3008/projects/${process.env.TEST_PROJECT}/gantt`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const main = page.getByRole('main');
    await main.waitFor({ state: 'visible', timeout: 90000 });
    await page.locator('.wx-bar.wx-summary').waitFor({ state: 'visible', timeout: 30000 });
    const mainText = await main.innerText();
    if (!mainText.includes('te') || !mainText.includes('tete')) {
      throw new Error('Converted hierarchy is not visible');
    }

    await page.getByRole('button', { name: 'Nova tarefa' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    const dialogText = await dialog.innerText();
    ['Tipo de tarefa', 'Descrição', 'Cor', 'Progresso', 'Tarefa geral'].forEach((label) => {
      if (!dialogText.includes(label)) {
        throw new Error(`Missing panel field: ${label}`);
      }
    });
    await dialog.locator('#gantt-task-type').selectOption('summary');
    if (await dialog.locator('#gantt-task-progress').count()) {
      throw new Error('Summary task exposes editable progress');
    }
    await page.keyboard.press('Escape');

    await page.getByText('te', { exact: true }).first().click();
    const editDialog = page.getByRole('dialog', { name: 'Editar tarefa' });
    await editDialog.getByRole('button', { name: 'Adicionar subtarefa' }).waitFor();
    await page.screenshot({ path: '/tmp/gantt-hierarchy-settings.png', fullPage: true });

    if (errors.length > 0) {
      throw new Error(`Browser errors: ${errors.join(' | ')}`);
    }
    process.stdout.write('Gantt hierarchy smoke test passed\n');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
