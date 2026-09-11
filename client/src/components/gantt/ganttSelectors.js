import { countGanttBusinessDays } from '../../utils/gantt-dates';

export const selectItemsById = (items) => Object.fromEntries(items.map((item) => [item.id, item]));

export const selectGeneralItems = (items) => items.filter(({ itemType }) => itemType === 'summary');

export const selectTimelineData = (items, links = []) => {
  const childrenByParentId = new Map();
  items.forEach((item) => {
    if (!childrenByParentId.has(item.parentId)) childrenByParentId.set(item.parentId, []);
    childrenByParentId.get(item.parentId).push(item);
  });
  const scheduledById = new Map();
  const ranges = new Map();
  const visit = (item, visited = new Set()) => {
    if (visited.has(item.id)) return null;
    if (ranges.has(item.id)) return ranges.get(item.id);
    const nextVisited = new Set([...visited, item.id]);
    const children = (childrenByParentId.get(item.id) || [])
      .map((child) => visit(child, nextVisited))
      .filter(Boolean);
    const hasOwnDates = item.itemType !== 'summary' && item.startDate && item.endDate;
    const scheduled = hasOwnDates ? [item, ...children] : children;
    if (!scheduled.length) return null;
    const startDate = scheduled.map((child) => child.startDate).sort()[0];
    const endDate = scheduled
      .map((child) => child.endDate)
      .sort()
      .at(-1);
    let { expectedDurationDays } = item;
    if (!hasOwnDates) {
      expectedDurationDays =
        item.itemType === 'summary'
          ? children.reduce((total, child) => total + child.expectedDurationDays, 0)
          : countGanttBusinessDays(startDate, endDate);
    }
    const range = { startDate, endDate, expectedDurationDays };
    ranges.set(item.id, range);
    scheduledById.set(item.id, hasOwnDates ? item : { ...item, ...range, hasDerivedDates: true });
    return range;
  };
  items.forEach((item) => visit(item));
  const timelineItems = items
    .filter((item) => scheduledById.has(item.id))
    .map((item) => scheduledById.get(item.id));

  return {
    timelineItems,
    timelineLinks: links.filter(
      ({ sourceItemId, targetItemId }) =>
        scheduledById.has(sourceItemId) && scheduledById.has(targetItemId),
    ),
    unscheduledItems: items.filter(
      ({ itemType, startDate }) => (itemType === 'task' || itemType === 'delivery') && !startDate,
    ),
  };
};
