const GRID_COLUMNS = 12;

export const DASHBOARD_WIDGETS = {
  progress: { minW: 3, minH: 3, maxW: 12, maxH: 10 },
  status: { minW: 4, minH: 3, maxW: 12, maxH: 5 },
  upcoming: { minW: 2, minH: 3, maxW: 12, maxH: 10 },
  attention: { minW: 4, minH: 4, maxW: 12, maxH: 10 },
};

export const createDefaultDashboardLayout = () => [
  { id: 'overview', type: 'progress', x: 0, y: 0, w: 7, h: 6 },
  { id: 'status-overview', type: 'status', x: 7, y: 0, w: 3, h: 3 },
  { id: 'upcoming-top', type: 'upcoming', x: 10, y: 0, w: 2, h: 3 },
  { id: 'attention-overview', type: 'attention', x: 7, y: 3, w: 5, h: 3 },
  { id: 'upcoming-list', type: 'upcoming', x: 0, y: 6, w: 4, h: 4 },
  { id: 'attention-list', type: 'attention', x: 4, y: 6, w: 4, h: 4 },
  { id: 'status-detail', type: 'status', x: 8, y: 6, w: 4, h: 4 },
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

    const normalizedItem = {
      id: String(item.id),
      type: item.type,
      x: Number(item.x),
      y: Number(item.y),
      w: Number(item.w),
      h: Number(item.h),
    };

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

export { GRID_COLUMNS };
