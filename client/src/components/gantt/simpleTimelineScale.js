import { differenceInGanttDays, formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';

const compareByStartDate = (first, second) =>
  first.startDate.localeCompare(second.startDate) || first.task.localeCompare(second.task);

const compareMilestones = (first, second) => {
  const dateComparison = first.startDate.localeCompare(second.startDate);

  if (dateComparison) {
    return dateComparison;
  }

  if (first.itemType === 'summary' && second.itemType !== 'summary') {
    return -1;
  }

  if (first.itemType !== 'summary' && second.itemType === 'summary') {
    return 1;
  }

  return first.task.localeCompare(second.task);
};

export const getSimpleTimelineRange = (items) => {
  const scheduledItems = items.filter(({ startDate, endDate }) => startDate && endDate);

  if (scheduledItems.length === 0) {
    return null;
  }

  return {
    startDate: scheduledItems.map(({ startDate }) => startDate).sort()[0],
    endDate: scheduledItems
      .map(({ endDate }) => endDate)
      .sort()
      .at(-1),
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
      return {
        ...result,
        [item.parentId]: [...(result[item.parentId] || []), item],
      };
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

export const getSimpleTimelineMilestones = (items) => {
  const childCounts = items.reduce((result, { itemType, parentId }) => {
    if (itemType === 'task' && parentId) {
      return { ...result, [parentId]: (result[parentId] || 0) + 1 };
    }

    return result;
  }, {});
  return items
    .map((item) => ({ ...item, childCount: childCounts[item.id] || 0 }))
    .sort(compareMilestones);
};

const distributeTimelineLanes = (items) =>
  items.sort(compareByStartDate).reduce((lanes, item) => {
    const availableLane = lanes.find((lane) => lane.at(-1).endDate < item.startDate);

    if (availableLane) {
      availableLane.push(item);
    } else {
      lanes.push([item]);
    }

    return lanes;
  }, []);

export const getSimpleTimelineHierarchy = (items) => {
  const parents = items.filter(({ itemType }) => itemType === 'summary').sort(compareByStartDate);
  const parentIds = new Set(parents.map(({ id }) => id));
  const childGroups = parents
    .map(({ id }) => {
      const lanes = distributeTimelineLanes(
        items.filter(({ itemType, parentId }) => itemType === 'task' && parentId === id),
      );

      return lanes.length > 0
        ? { parentId: id, lanes: lanes.map((lane) => lane.map(({ id: itemId }) => itemId)) }
        : null;
    })
    .filter(Boolean);

  return {
    primaryItems: items
      .filter(
        ({ itemType, parentId }) => itemType === 'summary' || !parentId || !parentIds.has(parentId),
      )
      .sort(compareMilestones),
    childGroups,
  };
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
