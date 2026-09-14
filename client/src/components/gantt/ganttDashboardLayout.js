// Sizing rules shared by the dashboard variant of the Gantt adapter and the
// dashboard widget that paginates items into pages that fit those rules.

export const DASHBOARD_GANTT_MIN_ROW_HEIGHT = 30;
export const DASHBOARD_GANTT_MAX_ROW_HEIGHT = 44;
export const DASHBOARD_GANTT_TARGET_ROW_HEIGHT = 38;
export const DASHBOARD_GANTT_MIN_FONT_SIZE = 13;
export const DASHBOARD_GANTT_MAX_FONT_SIZE = 17;
export const DASHBOARD_GANTT_MIN_PAGE_SIZE = 4;

// Horizontal scrollbar and border allowance below the last row.
const CHART_CHROME_HEIGHT = 18;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const getDashboardGanttScaleHeight = (height) => {
  if (height < 500) return 24;
  if (height < 720) return 28;
  return 32;
};

export const getDashboardGanttRowsHeight = (height) =>
  Math.max(0, height - getDashboardGanttScaleHeight(height) * 2 - CHART_CHROME_HEIGHT);

export const getDashboardGanttRowHeight = (height, itemCount) =>
  clamp(
    Math.floor(getDashboardGanttRowsHeight(height) / Math.max(1, itemCount)),
    DASHBOARD_GANTT_MIN_ROW_HEIGHT,
    DASHBOARD_GANTT_MAX_ROW_HEIGHT,
  );

export const getDashboardGanttFontSize = (rowHeight) =>
  clamp(Math.round(rowHeight * 0.42), DASHBOARD_GANTT_MIN_FONT_SIZE, DASHBOARD_GANTT_MAX_FONT_SIZE);

export const getDashboardGanttPageSize = (height) =>
  Math.max(
    DASHBOARD_GANTT_MIN_PAGE_SIZE,
    Math.floor(getDashboardGanttRowsHeight(height) / DASHBOARD_GANTT_TARGET_ROW_HEIGHT),
  );

const orderDepthFirst = (items) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const childrenByParentId = new Map();
  const roots = [];

  items.forEach((item) => {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    if (!parent) {
      roots.push(item);
      return;
    }
    if (!childrenByParentId.has(parent.id)) childrenByParentId.set(parent.id, []);
    childrenByParentId.get(parent.id).push(item);
  });

  const ordered = [];
  const visit = (item, ancestors) => {
    if (ancestors.some((ancestor) => ancestor.id === item.id)) return;
    ordered.push({ item, ancestors });
    (childrenByParentId.get(item.id) || []).forEach((child) => visit(child, [...ancestors, item]));
  };
  roots.forEach((root) => visit(root, []));

  return ordered;
};

// Splits items into pages of at most pageSize rows. A page that starts inside a
// subtree repeats the ancestors first so every row keeps its parent on screen.
export const paginateDashboardGanttItems = (items, pageSize) => {
  const ordered = orderDepthFirst(items);
  if (ordered.length === 0) return [];

  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pages = [];
  let index = 0;

  while (index < ordered.length) {
    const { ancestors } = ordered[index];
    const context = size > 1 ? ancestors.slice(-(size - 1)) : [];
    const page = [...context];
    const pageIds = new Set(context.map(({ id }) => id));

    while (index < ordered.length && (page.length < size || page.length === context.length)) {
      const { item } = ordered[index];
      if (!pageIds.has(item.id)) {
        page.push(item);
        pageIds.add(item.id);
      }
      index += 1;
    }

    pages.push(page);
  }

  return pages;
};

export const filterDashboardGanttLinks = (links, items) => {
  const ids = new Set(items.map(({ id }) => id));
  return links.filter((link) => ids.has(link.sourceItemId) && ids.has(link.targetItemId));
};
