const GRID_COLUMNS = 12;

export const DASHBOARD_WIDGETS = {
  progress: { minW: 3, editorMinW: 4, minH: 3, maxW: 12, maxH: 10 },
  status: { minW: 3, editorMinW: 3, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 2, editorMinW: 3, minH: 3, maxW: 12, maxH: 10 },
  attention: { minW: 4, editorMinW: 4, minH: 3, maxW: 12, maxH: 10 },
  gantt: { minW: 6, editorMinW: 6, minH: 5, maxW: 12, maxH: 12 },
  blachereProducts: { minW: 3, editorMinW: 3, minH: 4, maxW: 12, maxH: 10 },
  codexUsage: { minW: 4, editorMinW: 4, minH: 4, maxW: 6, maxH: 6 },
};

export const GANTT_ZOOM_LEVELS = ['day', 'week', 'month', 'quarter'];

const BLACHERE_PRODUCT_STATUSES = ['done', 'pending'];
const MAX_BLACHERE_PRODUCTS = 50;

export const GRIDSTACK_DASHBOARD_COMPONENT = 'DashboardWidget';

const normalizeWidgetConfig = (type, config) => {
  if (type === 'blachereProducts') {
    if (config === undefined) {
      return undefined;
    }

    if (
      !config ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      !Array.isArray(config.tasks)
    ) {
      throw new Error('Blachere Products widget must have a task list configuration');
    }

    if (config.tasks.length > MAX_BLACHERE_PRODUCTS) {
      throw new Error('Blachere Products widget has too many tasks');
    }

    const taskIds = new Set();
    return {
      tasks: config.tasks.map((task) => {
        if (
          !task ||
          typeof task !== 'object' ||
          Array.isArray(task) ||
          typeof task.id !== 'string' ||
          task.id.trim() === '' ||
          task.id.length > 64 ||
          taskIds.has(task.id) ||
          typeof task.title !== 'string' ||
          task.title.trim() === '' ||
          task.title.length > 160 ||
          !BLACHERE_PRODUCT_STATUSES.includes(task.twoD) ||
          !BLACHERE_PRODUCT_STATUSES.includes(task.threeD)
        ) {
          throw new Error('Blachere Products widget has an invalid task');
        }

        taskIds.add(task.id);
        return {
          id: task.id,
          title: task.title.trim(),
          twoD: task.twoD,
          threeD: task.threeD,
        };
      }),
    };
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

  return {
    projectId: config.projectId,
    zoomLevel: config.zoomLevel,
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
  {
    id: 'blachere-products',
    type: 'blachereProducts',
    x: 0,
    y: 10,
    w: 12,
    h: 5,
  },
  { id: 'codex-usage', type: 'codexUsage', x: 0, y: 15, w: 4, h: 4 },
];

export const normalizeDashboardLayout = (layout) => {
  if (!Array.isArray(layout)) {
    throw new Error('Dashboard layout must be an array');
  }

  const ids = new Set();

  return layout.map((item) => {
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
    minH: constraints.minH,
    minW: constraints.editorMinW || constraints.minW,
    props: { widget },
  };
};

export const fromGridStackDashboardWidgets = (widgets) =>
  normalizeDashboardLayout(
    widgets.map((widget) => {
      const originalWidget = widget.props.widget;

      return {
        ...originalWidget,
        h: Number(widget.h ?? widget.minH ?? originalWidget.h),
        id: String(widget.id),
        w: Number(widget.w ?? widget.minW ?? originalWidget.w),
        x: Number(widget.x),
        y: Number(widget.y),
      };
    }),
  );

export { GRID_COLUMNS };
