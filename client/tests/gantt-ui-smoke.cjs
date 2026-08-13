const { chromium } = require('@playwright/test');

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

  if (!response.ok) {
    throw new Error(`${method} ${path} returned ${response.status}`);
  }

  return response.json();
};

(async () => {
  let browser;
  let token;
  let projectId;
  let firstItemId;

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
      body: { type: 'private', name: 'Gantt visual smoke test' },
    });
    projectId = projectBody.item.id;

    const planBody = await request(`/projects/${projectId}/gantt-plan`, {
      token,
      method: 'POST',
      body: {},
    });
    const planId = planBody.item.id;

    const firstItemBody = await request(`/gantt-plans/${planId}/items`, {
      token,
      method: 'POST',
      body: {
        task: 'Preparar campanha',
        project: 'Natal',
        status: 'Planeado',
        startDate: '2026-08-10',
        endDate: '2026-08-14',
        expectedDurationDays: 5,
        assigneeUserIds: [],
      },
    });
    firstItemId = firstItemBody.item.id;
    await request(`/gantt-plans/${planId}/items`, {
      token,
      method: 'POST',
      body: {
        task: 'Aprovação criativa',
        project: 'Natal',
        status: 'Em curso',
        startDate: '2026-08-15',
        endDate: '2026-08-17',
        expectedDurationDays: 3,
        assigneeUserIds: [],
      },
    });
    await request(`/gantt-plans/${planId}/items`, {
      token,
      method: 'POST',
      body: {
        task: 'Validar orçamento',
        status: 'Por iniciar',
        expectedDurationDays: 2,
        assigneeUserIds: [],
      },
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addCookies([
      { name: 'accessToken', value: token, url: 'http://localhost:3008' },
      { name: 'accessTokenVersion', value: '1', url: 'http://localhost:3008' },
    ]);

    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`http://localhost:3008/projects/${projectId}/gantt`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.getByRole('main').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(2500);

    const firstBar = page.locator('.wx-bar').first();
    const barBox = await firstBar.boundingBox();
    if (!barBox) {
      throw new Error('The first Gantt bar is not visible');
    }

    const themeContract = await page.getByRole('main').evaluate((element) => ({
      backgroundColor: getComputedStyle(element).backgroundColor,
      hasDarkTheme: Boolean(element.querySelector('.wx-willow-dark-theme')),
      hasLightTheme: Boolean(element.querySelector('.wx-willow-theme')),
    }));
    if (
      !themeContract.hasDarkTheme ||
      themeContract.hasLightTheme ||
      themeContract.backgroundColor === 'rgb(255, 255, 255)'
    ) {
      throw new Error(`Unexpected Gantt theme contract: ${JSON.stringify(themeContract)}`);
    }

    await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(barBox.x + barBox.width / 2 + 36, barBox.y + barBox.height / 2, {
      steps: 6,
    });
    await page.mouse.up();
    // PLANKA mutations travel over the Socket.IO connection, so confirm the
    // result through a fresh API read instead of waiting for an HTTP PATCH.
    await page.waitForTimeout(1500);

    const movedBarBox = await firstBar.boundingBox();
    const resizeX = movedBarBox.x + movedBarBox.width - 6;
    const resizeY = movedBarBox.y + movedBarBox.height / 2;
    await page.mouse.move(resizeX, resizeY);
    await page.waitForTimeout(250);
    const resizeCursor = await firstBar.evaluate((element) => element.style.cursor);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.move(resizeX + 36, resizeY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(1500);

    const refreshedPlan = await request(`/projects/${projectId}/gantt-plan`, {
      token,
    });
    const movedItem = refreshedPlan.included.ganttItems.find(({ id }) => id === firstItemId);
    if (
      movedItem.startDate !== '2026-08-12' ||
      movedItem.endDate !== '2026-08-18' ||
      movedItem.expectedDurationDays !== 7
    ) {
      throw new Error(
        `Unexpected persisted values after drag/resize: ${movedItem.startDate} - ${movedItem.endDate} (${movedItem.expectedDurationDays} days), cursor=${resizeCursor}`,
      );
    }

    await page.screenshot({ path: '/tmp/gantt-workspace.png', fullPage: true });

    const zoomBarBox = await firstBar.boundingBox();
    const scaleWidthBeforeZoom = zoomBarBox.width;
    await page.keyboard.down('Control');
    await page.mouse.move(
      zoomBarBox.x + zoomBarBox.width / 2,
      zoomBarBox.y + zoomBarBox.height / 2,
    );
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');
    await page.waitForTimeout(300);
    const scaleWidthAfterZoom = (await firstBar.boundingBox()).width;
    if (scaleWidthAfterZoom <= scaleWidthBeforeZoom) {
      throw new Error(
        `Native Gantt zoom did not increase the scale width: ${scaleWidthBeforeZoom} -> ${scaleWidthAfterZoom}`,
      );
    }

    const zoomSelect = page.locator('.wx-richselect').first();
    await zoomSelect.click();
    const quarterOption = page.locator('.wx-dropdown .wx-item', { hasText: 'Trimestre' });
    await quarterOption.waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/gantt-zoom-dropdown.png', fullPage: true });
    await quarterOption.click();
    await page.waitForTimeout(200);
    if (!(await page.getByRole('main').innerText()).includes('Q3')) {
      throw new Error('Quarter zoom did not render the quarterly timeline scale');
    }

    await zoomSelect.click();
    await page.locator('.wx-dropdown .wx-item', { hasText: 'Semana' }).click();

    const newTaskButton = page.getByRole('button', { name: 'Nova tarefa' });
    await newTaskButton.click();
    const itemDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await itemDialog.waitFor({ state: 'visible' });
    const initialFocusId = await page.evaluate(() => document.activeElement?.id);
    if (initialFocusId !== 'gantt-task-name') {
      throw new Error(`Unexpected initial panel focus: ${initialFocusId}`);
    }
    await page.keyboard.press('Escape');
    await itemDialog.waitFor({ state: 'hidden' });
    await page.waitForTimeout(50);
    const focusWasRestored = await newTaskButton.evaluate(
      (element) => document.activeElement === element,
    );
    if (!focusWasRestored) {
      throw new Error('Focus was not restored to the panel trigger');
    }
    const ganttMainText = (await page.getByRole('main').innerText()).slice(0, 2000);

    await page.getByRole('button', { name: 'Editar' }).click();
    const settingsModal = page.locator('.project-settings');
    await settingsModal.waitFor({ state: 'visible' });
    await settingsModal.getByText('Disponibilidade do Gantt', { exact: true }).waitFor();
    if (await settingsModal.getByText('Escala inicial', { exact: true }).count()) {
      throw new Error('The initial timeline scale is still exposed in project settings');
    }
    if (await settingsModal.getByText('Gantt', { exact: true }).count() !== 1) {
      throw new Error('Gantt should appear once as a General settings section, not as a tab');
    }
    await page.screenshot({ path: '/tmp/gantt-general-settings.png', fullPage: true });

    const ganttSettingsDropdown = settingsModal.locator('.ui.dropdown').last();
    if ((await ganttSettingsDropdown.count()) === 0) {
      const ganttLabel = settingsModal.getByText('Disponibilidade do Gantt', { exact: true });
      throw new Error(`Gantt dropdown DOM: ${await ganttLabel.evaluate((element) => element.parentElement.outerHTML)}`);
    }
    const clickCenter = async (locator) => {
      const box = await locator.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    };
    await clickCenter(ganttSettingsDropdown);
    const disabledOption = ganttSettingsDropdown.getByRole('option', {
      name: 'Desativado',
      exact: true,
    });
    await disabledOption.waitFor({ state: 'visible' });
    await clickCenter(disabledOption);
    await page.waitForTimeout(500);
    const disabledPlan = await request(`/projects/${projectId}/gantt-plan`, { token });
    if (disabledPlan.item.isEnabled) {
      throw new Error('Gantt was not disabled from General project settings');
    }

    let reenableDropdown = ganttSettingsDropdown;
    if (!(await settingsModal.isVisible())) {
      await page.getByRole('button', { name: 'Editar' }).click();
      await settingsModal.waitFor({ state: 'visible' });
      reenableDropdown = settingsModal.locator('.ui.dropdown').last();
    }
    await clickCenter(reenableDropdown);
    const enabledOption = reenableDropdown.getByRole('option', {
      name: 'Ativado',
      exact: true,
    });
    await enabledOption.waitFor({ state: 'visible' });
    await clickCenter(enabledOption);
    await page.waitForTimeout(500);
    const reenabledPlan = await request(`/projects/${projectId}/gantt-plan`, { token });
    if (!reenabledPlan.item.isEnabled || reenabledPlan.included.ganttItems.length !== 3) {
      throw new Error('Gantt was not re-enabled with its existing tasks preserved');
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          url: page.url(),
          movedAndResized: `${movedItem.startDate}:${movedItem.endDate}:${movedItem.expectedDurationDays}`,
          resizeCursor,
          nativeZoom: `${scaleWidthBeforeZoom}:${scaleWidthAfterZoom}`,
          panelFocus: `${initialFocusId}:${focusWasRestored}`,
          settingsToggle: `${disabledPlan.item.isEnabled}:${reenabledPlan.item.isEnabled}`,
          mainText: ganttMainText,
          errors,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (token && projectId) {
      await request(`/projects/${projectId}`, {
        token,
        method: 'DELETE',
      }).catch(() => {});
    }
  }

  process.exit(0);
})().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
