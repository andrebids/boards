const GRID_COLUMNS = 12;

export const DASHBOARD_WIDGETS = {
  progress: { minW: 3, editorMinW: 4, minH: 3, maxW: 12, maxH: 10 },
  status: { minW: 3, editorMinW: 3, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 2, editorMinW: 3, minH: 3, maxW: 12, maxH: 10 },
  attention: { minW: 4, editorMinW: 4, minH: 3, maxW: 12, maxH: 10 },
  gantt: { minW: 6, editorMinW: 6, minH: 5, maxW: 12, maxH: 12 },
  blachereProducts: { minW: 3, editorMinW: 3, minH: 4, maxW: 12, maxH: 10 },
  blachereStatic: { minW: 3, editorMinW: 3, minH: 4, maxW: 12, maxH: 10 },
  blachereAnimated: { minW: 3, editorMinW: 3, minH: 4, maxW: 12, maxH: 10 },
  codexUsage: { minW: 4, editorMinW: 4, minH: 4, gridMinH: 7, maxW: 12, maxH: 10 },
  factorialEntrance: { minW: 2, editorMinW: 2, minH: 2, maxW: 2, maxH: 2 },
};

export const GANTT_ZOOM_LEVELS = ['day', 'week', 'month', 'quarter'];
export const GANTT_ROTATION_MIN_SECONDS = 5;
export const GANTT_ROTATION_MAX_SECONDS = 300;

export const GRIDSTACK_DASHBOARD_COMPONENT = 'DashboardWidget';

export const parseDashboardCardId = (value) => {
  const normalizedValue = String(value || '').trim();
  const urlMatch = normalizedValue.match(/\/cards\/([^/?#]+)/);

  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }

  return /^[\w-]+$/.test(normalizedValue) ? normalizedValue : null;
};

const BLACHERE_WIDGET_TYPES = new Set(['blachereProducts', 'blachereStatic', 'blachereAnimated']);
const HIDDEN_WIDGET_TYPES = new Set(['blachereProducts']);
const TASK_STATE_COLUMNS = ['twoD', 'threeD'];

const normalizeBlachereTaskConfig = (config) => {
  if (config === undefined) {
    return undefined;
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Blachere dashboard widget configuration is invalid');
  }

  if (config.taskStates === undefined) {
    return undefined;
  }

  if (
    !config.taskStates ||
    typeof config.taskStates !== 'object' ||
    Array.isArray(config.taskStates)
  ) {
    throw new Error('Blachere dashboard widget task states are invalid');
  }

  const taskStates = Object.entries(config.taskStates).reduce((result, [taskId, state]) => {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Blachere dashboard widget task state is invalid');
    }

    const normalizedState = TASK_STATE_COLUMNS.reduce((nextState, column) => {
      if (state[column] === undefined) {
        return nextState;
      }

      if (!['done', 'pending'].includes(state[column])) {
        throw new Error('Blachere dashboard widget has an invalid task state');
      }

      return { ...nextState, [column]: state[column] };
    }, {});

    return Object.keys(normalizedState).length > 0
      ? { ...result, [taskId]: normalizedState }
      : result;
  }, {});

  return Object.keys(taskStates).length > 0 ? { taskStates } : undefined;
};

const normalizeWidgetConfig = (type, config) => {
  if (BLACHERE_WIDGET_TYPES.has(type)) {
    return normalizeBlachereTaskConfig(config);
  }

  if (type !== 'gantt') {
    return undefined;
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Gantt dashboard widget must have a configuration');
  }

  if (typeof config.projectId !== 'string' || config.projectId.trim() === '') {
    throw new Error('Gantt dashboard widget must reference a project');
  }

  if (!GANTT_ZOOM_LEVELS.includes(config.zoomLevel)) {
    throw new Error('Gantt dashboard widget has an invalid zoom level');
  }

  const normalizedConfig = {
    projectId: config.projectId,
    zoomLevel: config.zoomLevel,
  };

  const hasRotationConfig =
    config.cardId !== undefined ||
    config.taskListId !== undefined ||
    config.rotationSeconds !== undefined;

  if (!hasRotationConfig) {
    return normalizedConfig;
  }

  if (
    typeof config.cardId !== 'string' ||
    config.cardId.trim() === '' ||
    typeof config.taskListId !== 'string' ||
    config.taskListId.trim() === '' ||
    !Number.isInteger(config.rotationSeconds) ||
    config.rotationSeconds < GANTT_ROTATION_MIN_SECONDS ||
    config.rotationSeconds > GANTT_ROTATION_MAX_SECONDS
  ) {
    throw new Error('Gantt dashboard widget has an invalid rotation configuration');
  }

  return {
    ...normalizedConfig,
    cardId: config.cardId,
    taskListId: config.taskListId,
    rotationSeconds: config.rotationSeconds,
  };
};

export const createDefaultDashboardLayout = () => [
  { id: 'overview', type: 'progress', x: 0, y: 0, w: 6, h: 6 },
  { id: 'status-overview', type: 'status', x: 6, y: 0, w: 3, h: 3 },
  { id: 'upcoming-top', type: 'upcoming', x: 9, y: 0, w: 3, h: 3 },
  { id: 'attention-overview', type: 'attention', x: 6, y: 3, w: 6, h: 3 },
  { id: 'upcoming-list', type: 'upcoming', x: 0, y: 6, w: 4, h: 4 },
  { id: 'attention-list', type: 'attention', x: 4, y: 6, w: 4, h: 4 },
  { id: 'status-detail', type: 'status', x: 8, y: 6, w: 4, h: 4 },
  { id: 'codex-usage', type: 'codexUsage', x: 0, y: 10, w: 4, h: 4 },
];

export const normalizeDashboardLayout = (layout) => {
  if (!Array.isArray(layout)) {
    throw new Error('Dashboard layout must be an array');
  }

  const ids = new Set();
  const visibleLayout = layout.filter((item) => !HIDDEN_WIDGET_TYPES.has(item.type));

  return visibleLayout.map((item) => {
    const widget = DASHBOARD_WIDGETS[item.type];

    if (!widget) {
      throw new Error('Unknown dashboard widget');
    }

    if (ids.has(item.id)) {
      throw new Error('Dashboard widget ids must be unique');
    }

    ids.add(item.id);

    const config = normalizeWidgetConfig(item.type, item.config);
    const normalizedItem = {
      id: String(item.id),
      type: item.type,
      x: Number(item.x),
      y: Number(item.y),
      w: Number(item.w),
      h: Number(item.h),
    };

    if (config) {
      normalizedItem.config = config;
    }

    if (
      !Number.isInteger(normalizedItem.x) ||
      !Number.isInteger(normalizedItem.y) ||
      !Number.isInteger(normalizedItem.w) ||
      !Number.isInteger(normalizedItem.h) ||
      normalizedItem.x < 0 ||
      normalizedItem.y < 0 ||
      normalizedItem.w < widget.minW ||
      normalizedItem.w > widget.maxW ||
      normalizedItem.h < widget.minH ||
      normalizedItem.h > widget.maxH ||
      normalizedItem.x + normalizedItem.w > GRID_COLUMNS
    ) {
      throw new Error('Dashboard widget is outside the dashboard grid');
    }

    return normalizedItem;
  });
};

export const mergeDashboardLayoutGeometry = (layout, gridWidgets) => {
  const widgetsById = new Map(layout.map((widget) => [widget.id, widget]));

  return gridWidgets.flatMap((gridWidget) => {
    const widget = widgetsById.get(String(gridWidget.id));

    return widget
      ? [
          {
            ...widget,
            x: Number(gridWidget.x),
            y: Number(gridWidget.y),
            w: Number(gridWidget.w),
            h: Number(gridWidget.h),
          },
        ]
      : [];
  });
};

export const hasDashboardGridChanged = (previousLayout, nextLayout) => {
  if (!previousLayout || previousLayout.length !== nextLayout.length) {
    return true;
  }

  const previousWidgetsById = new Map(previousLayout.map((widget) => [widget.id, widget]));

  return nextLayout.some((widget) => {
    const previousWidget = previousWidgetsById.get(widget.id);

    return (
      !previousWidget ||
      previousWidget.type !== widget.type ||
      previousWidget.x !== widget.x ||
      previousWidget.y !== widget.y ||
      previousWidget.w !== widget.w ||
      previousWidget.h !== widget.h
    );
  });
};

const widgetsOverlap = (first, second) =>
  !(
    first.x + first.w <= second.x ||
    first.x >= second.x + second.w ||
    first.y + first.h <= second.y ||
    first.y >= second.y + second.h
  );

export const placeDashboardWidget = (layout, widget) => {
  const normalizedLayout = normalizeDashboardLayout(layout);

  for (let y = 0; ; y += 1) {
    for (let x = 0; x <= GRID_COLUMNS - widget.w; x += 1) {
      const candidate = { ...widget, x, y };

      if (!normalizedLayout.some((existingWidget) => widgetsOverlap(candidate, existingWidget))) {
        return candidate;
      }
    }
  }
};

export const removeDashboardWidget = (layout, widgetId) =>
  normalizeDashboardLayout(layout).filter((widget) => widget.id !== widgetId);

export const toGridStackDashboardWidget = (widget) => {
  const constraints = DASHBOARD_WIDGETS[widget.type];

  return {
    ...widget,
    component: GRIDSTACK_DASHBOARD_COMPONENT,
    maxH: constraints.maxH,
    maxW: constraints.maxW,
    minH: constraints.gridMinH || constraints.minH,
    minW: constraints.editorMinW || constraints.minW,
    props: { widget },
  };
};

export const fromGridStackDashboardWidgets = (widgets, currentLayout) => {
  const serializedWidgets = widgets.map((widget) => {
    const originalWidget = widget.props.widget;

    return {
      ...originalWidget,
      h: Number(widget.h ?? widget.minH ?? originalWidget.h),
      id: String(widget.id),
      w: Number(widget.w ?? widget.minW ?? originalWidget.w),
      x: Number(widget.x),
      y: Number(widget.y),
    };
  });

  return currentLayout
    ? mergeDashboardLayoutGeometry(currentLayout, serializedWidgets)
    : normalizeDashboardLayout(serializedWidgets);
};

export { GRID_COLUMNS };
