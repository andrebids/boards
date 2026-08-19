import { differenceInGanttDays, formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';

const compareByStartDate = (first, second) =>
  first.startDate.localeCompare(second.startDate) || first.task.localeCompare(second.task);

export const getSimpleTimelineRange = (items) => {
  const scheduledItems = items.filter(({ startDate, endDate }) => startDate && endDate);

  if (scheduledItems.length === 0) {
    return null;
  }

  return {
    startDate: scheduledItems.map(({ startDate }) => startDate).sort()[0],
    endDate: scheduledItems.map(({ endDate }) => endDate).sort().at(-1),
  };
};

export const getSimpleTimelineBarStyle = (range, item) => {
  if (!range || !item.startDate || !item.endDate) {
    return null;
  }

  const totalDays = differenceInGanttDays(range.startDate, range.endDate) + 1;
  const leftDays = differenceInGanttDays(range.startDate, item.startDate);
  const itemDays = differenceInGanttDays(item.startDate, item.endDate) + 1;

  if (totalDays <= 0 || leftDays < 0 || itemDays <= 0) {
    return null;
  }

  return {
    left: `${(leftDays / totalDays) * 100}%`,
    width: `${Math.min(100 - (leftDays / totalDays) * 100, (itemDays / totalDays) * 100)}%`,
  };
};

export const groupSimpleTimelineItems = (items) => {
  const itemsByParentId = items.reduce((result, item) => {
    if (item.itemType === 'task' && item.parentId) {
      (result[item.parentId] ||= []).push(item);
    }

    return result;
  }, {});
  const summaries = items.filter(({ itemType }) => itemType === 'summary').sort(compareByStartDate);
  const groupedItemIds = new Set();
  const groups = summaries.map((summary) => {
    const children = (itemsByParentId[summary.id] || []).sort(compareByStartDate);
    children.forEach(({ id }) => groupedItemIds.add(id));

    return {
      summaryId: summary.id,
      itemIds: children.map(({ id }) => id),
    };
  });
  const independentItems = items
    .filter(({ itemType, id }) => itemType !== 'summary' && !groupedItemIds.has(id))
    .sort(compareByStartDate);

  if (independentItems.length > 0) {
    groups.push({ summaryId: null, itemIds: independentItems.map(({ id }) => id) });
  }

  return groups;
};

export const getSimpleTimelineDays = (range) => {
  if (!range) {
    return [];
  }

  const days = [];
  const current = parseGanttDate(range.startDate);
  const end = parseGanttDate(range.endDate);

  while (current <= end) {
    days.push(formatGanttDate(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
};
