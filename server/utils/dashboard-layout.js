const GRID_COLUMNS = 12;

const WIDGETS = {
  progress: { minW: 3, minH: 3, maxW: 6, maxH: 5 },
  status: { minW: 4, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 4, minH: 4, maxW: 12, maxH: 10 },
  attention: { minW: 4, minH: 4, maxW: 12, maxH: 10 },
  gantt: { minW: 6, minH: 5, maxW: 12, maxH: 12 },
};

const GANTT_ZOOM_LEVELS = new Set(['day', 'week', 'month', 'quarter']);

const normalizeWidgetConfig = (type, config) => {
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
