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
    if ('progress' in firstItemBody.item) {
      throw new Error('The Gantt API still exposes progress');
    }
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
    if (await page.locator('.wx-progress-wrapper, .wx-progress-marker').count()) {
      throw new Error('The Gantt timeline still renders progress');
    }
    if (!(await page.locator('.wx-marker').first().isVisible())) {
      throw new Error('The Gantt today marker is not visible');
    }

    const themeContract = await page.getByRole('main').evaluate((element) => ({
      hasDarkTheme: Boolean(element.querySelector('.wx-willow-dark-theme')),
      hasLightTheme: Boolean(element.querySelector('.wx-willow-theme')),
    }));
    if (!themeContract.hasDarkTheme || themeContract.hasLightTheme) {
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

    const zoomSelect = page.getByTestId('gantt-zoom-select');
    /* eslint-disable no-await-in-loop */
    for (
      let attempt = 0;
      attempt < 10 && !(await zoomSelect.innerText()).includes('Dia');
      attempt += 1
    ) {
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -200);
      await page.keyboard.up('Control');
      await page.waitForTimeout(40);
    }
    /* eslint-enable no-await-in-loop */
    if (!(await zoomSelect.innerText()).includes('Dia')) {
      throw new Error('The zoom dropdown did not follow Ctrl+wheel zoom');
    }

    await zoomSelect.click();
    const quarterOption = zoomSelect.locator('.menu .item', { hasText: 'Trimestre' });
    await quarterOption.waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/gantt-zoom-dropdown.png', fullPage: true });
    await quarterOption.click();
    await page.waitForTimeout(200);
    if (!(await page.getByRole('main').innerText()).includes('Q3')) {
      throw new Error('Quarter zoom did not render the quarterly timeline scale');
    }

    await zoomSelect.click();
    await zoomSelect.locator('.menu .item', { hasText: 'Dia', exact: true }).click();
    await page.waitForTimeout(200);
    const weekendContract = await page.locator('[data-zoom-level="day"]').evaluate((element) => {
      const cells = [...element.querySelectorAll('.wx-scale .wx-row:last-child .wx-cell')];
      const weekend = cells.find((cell) => cell.classList.contains('wx-weekend'));
      const weekday = cells.find((cell) => !cell.classList.contains('wx-weekend'));
      return {
        weekendBackground: weekend && getComputedStyle(weekend).backgroundColor,
        weekdayBackground: weekday && getComputedStyle(weekday).backgroundColor,
      };
    });
    if (
      !weekendContract.weekendBackground ||
      weekendContract.weekendBackground === weekendContract.weekdayBackground
    ) {
      throw new Error(`Unexpected weekend highlight: ${JSON.stringify(weekendContract)}`);
    }

    await zoomSelect.click();
    await zoomSelect.locator('.menu .item', { hasText: 'Semana', exact: true }).click();

    const newTaskButton = page.getByRole('button', { name: 'Nova tarefa' });
    await newTaskButton.click();
    const itemDialog = page.getByRole('dialog', { name: 'Nova tarefa' });
    await itemDialog.waitFor({ state: 'visible' });
    const initialFocusId = await page.evaluate(() => document.activeElement?.id);
    if (initialFocusId !== 'gantt-task-name') {
      throw new Error(`Unexpected initial panel focus: ${initialFocusId}`);
    }
    if (await itemDialog.locator('#gantt-task-description').count()) {
      throw new Error('The compact panel still exposes a description field');
    }
    if (await itemDialog.locator('#gantt-task-progress').count()) {
      throw new Error('The compact panel still exposes editable progress');
    }
    if ((await itemDialog.locator('#gantt-task-status input').inputValue()) !== 'Por iniciar') {
      throw new Error('The compact panel does not use the default task status');
    }
    const durationUnits = await itemDialog
      .locator('#gantt-task-duration-unit .menu .item')
      .allTextContents();
    if (durationUnits.join('|') !== 'Dias|Semanas|Meses') {
      throw new Error(`Unexpected duration units: ${durationUnits.join('|')}`);
    }
    const panelLayout = await itemDialog.evaluate((element) => {
      const footer = element.querySelector('footer');
      return {
        footerBottom: footer.getBoundingClientRect().bottom,
        panelBottom: element.getBoundingClientRect().bottom,
      };
    });
    if (panelLayout.footerBottom > panelLayout.panelBottom + 1) {
      throw new Error(`The compact panel footer is clipped: ${JSON.stringify(panelLayout)}`);
    }

    await itemDialog.getByRole('button', { name: 'Adicionar membro' }).click();
    const firstMemberOption = page.getByRole('menuitemcheckbox').first();
    await firstMemberOption.waitFor({ state: 'visible' });
    const firstMemberName = (await firstMemberOption.innerText()).split('\n')[0];
    await firstMemberOption.click();
    await page.locator('.ui.popup').getByRole('button', { name: 'Fechar' }).click();
    await itemDialog.getByRole('button', { name: firstMemberName, exact: true }).waitFor();
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
    if ((await settingsModal.getByText('Gantt', { exact: true }).count()) !== 1) {
      throw new Error('Gantt should appear once as a General settings section, not as a tab');
    }
    await page.screenshot({ path: '/tmp/gantt-general-settings.png', fullPage: true });

    const ganttSettingsToggle = settingsModal.getByRole('checkbox', {
      name: 'Disponibilidade do Gantt',
      exact: true,
    });
    await ganttSettingsToggle.uncheck();
    await page.waitForTimeout(500);
    const disabledPlan = await request(`/projects/${projectId}/gantt-plan`, { token });
    if (disabledPlan.item.isEnabled) {
      throw new Error('Gantt was not disabled from General project settings');
    }

    let reenableToggle = ganttSettingsToggle;
    if (!(await settingsModal.isVisible())) {
      await page.getByRole('button', { name: 'Editar' }).click();
      await settingsModal.waitFor({ state: 'visible' });
      reenableToggle = settingsModal.getByRole('checkbox', {
        name: 'Disponibilidade do Gantt',
        exact: true,
      });
    }
    await reenableToggle.check();
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
