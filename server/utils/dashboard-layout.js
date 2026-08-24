const GRID_COLUMNS = 12;

const WIDGETS = {
  progress: { minW: 3, minH: 3, maxW: 12, maxH: 10 },
  status: { minW: 3, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 2, minH: 3, maxW: 12, maxH: 10 },
  attention: { minW: 4, minH: 3, maxW: 12, maxH: 10 },
  gantt: { minW: 6, minH: 5, maxW: 12, maxH: 12 },
  blachereProducts: { minW: 3, minH: 4, maxW: 12, maxH: 10 },
  codexUsage: { minW: 4, minH: 4, maxW: 6, maxH: 6 },
};

const GANTT_ZOOM_LEVELS = new Set(['day', 'week', 'month', 'quarter']);
const BLACHERE_PRODUCT_STATUSES = new Set(['done', 'pending']);
const MAX_BLACHERE_PRODUCTS = 50;

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
          !BLACHERE_PRODUCT_STATUSES.has(task.twoD) ||
          !BLACHERE_PRODUCT_STATUSES.has(task.threeD)
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

  if (!GANTT_ZOOM_LEVELS.has(config.zoomLevel)) {
    throw new Error('Gantt dashboard widget has an invalid zoom level');
  }

  return {
    projectId: config.projectId,
    zoomLevel: config.zoomLevel,
  };
};

const normalizeDashboardLayout = (layout) => {
  if (!Array.isArray(layout)) {
    throw new Error('Dashboard layout must be an array');
  }

  const ids = new Set();

  return layout.map((item) => {
    const widget = WIDGETS[item.type];

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

module.exports = { normalizeDashboardLayout };
