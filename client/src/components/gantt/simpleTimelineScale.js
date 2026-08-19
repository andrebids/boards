import {
  addGanttDays,
  differenceInGanttDays,
  formatGanttDate,
  parseGanttDate,
} from '../../utils/gantt-dates';

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
    .filter(({ itemType, id }) => itemType !== 'summary' && itemType !== 'delivery' && !groupedItemIds.has(id))
    .sort(compareByStartDate);

  if (independentItems.length > 0) {
    groups.push({
      summaryId: null,
      itemIds: independentItems.map(({ id }) => id),
    });
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
        ? {
            parentId: id,
            lanes: lanes.map((lane) => lane.map(({ id: itemId }) => itemId)),
          }
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

const DEFAULT_HORIZONTAL_PADDING = 80;
const DEFAULT_PIXELS_PER_DAY = 40;
const LANE_GAP = 24;
const LANE_SPACING = 76;
const AXIS_CLEARANCE = 84;
const CANVAS_PADDING = 84;

const getEstimatedLabelWidth = ({ task = '' }) =>
  Math.min(220, Math.max(112, task.length * 7.4 + 26));

const getWeekTicks = (startDate, endDate, dateToX) => {
  const cursor = parseGanttDate(startDate);
  const end = parseGanttDate(endDate);

  while (cursor.getDay() !== 1) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const ticks = [];
  while (cursor <= end) {
    const date = formatGanttDate(cursor);
    ticks.push({ date, x: dateToX(date) });
    cursor.setDate(cursor.getDate() + 7);
  }

  return ticks;
};

const distributePixelLanes = (items, dateToX, pixelsPerDay) => {
  const lanes = [];

  items.sort(compareByStartDate).forEach((item) => {
    const startX = dateToX(item.startDate);
    const endX = dateToX(addGanttDays(item.endDate, 1));
    const labelWidth = getEstimatedLabelWidth(item);
    const occupiedEndX = Math.max(endX, startX + labelWidth) + LANE_GAP;
    const laneIndex = lanes.findIndex((lane) => lane.occupiedEndX <= startX);
    const lane = laneIndex === -1 ? { occupiedEndX: 0, tasks: [] } : lanes[laneIndex];

    if (laneIndex === -1) {
      lanes.push(lane);
    }

    lane.occupiedEndX = occupiedEndX;
    lane.tasks.push({
      ...item,
      startX,
      endX: Math.max(startX + Math.max(2, pixelsPerDay * 0.35), endX),
      labelWidth,
    });
  });

  return lanes.map(({ tasks }) => tasks);
};

const getTimelineGroups = (items) => {
  const scheduledItems = items.filter(({ startDate, endDate }) => startDate && endDate);
  const summaries = scheduledItems.filter(({ itemType }) => itemType === 'summary');
  const summariesById = new Map(summaries.map((item) => [item.id, item]));
  const groupsById = new Map();

  scheduledItems
    .filter(({ itemType }) => itemType !== 'summary' && itemType !== 'delivery')
    .forEach((item) => {
      const parent = summariesById.get(item.parentId);
      const id = parent ? `summary-${parent.id}` : `loose-${item.project || 'tasks'}`;
      const label = parent?.task || item.project || '';
      const group = groupsById.get(id) || { id, label, items: [] };
      group.items.push(item);
      groupsById.set(id, group);
    });

  return [...groupsById.values()]
    .filter(({ items: groupItems }) => groupItems.length > 0)
    .sort((first, second) => compareByStartDate(first.items[0], second.items[0]));
};

export const getSimpleTimelineLayout = (
  items,
  {
    pixelsPerDay = DEFAULT_PIXELS_PER_DAY,
    horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
    viewportWidth = 0,
    viewportHeight = 0,
    today = formatGanttDate(new Date()),
  } = {},
) => {
  const range = getSimpleTimelineRange(items);
  if (!range) {
    return null;
  }

  const timelineStart = addGanttDays(range.startDate, -2);
  const timelineEnd = addGanttDays(range.endDate, 2);
  const totalDays = Math.max(1, differenceInGanttDays(timelineStart, timelineEnd));
  const availableWidth = viewportWidth > horizontalPadding * 2 ? viewportWidth - horizontalPadding * 2 : 0;
  const effectivePixelsPerDay =
    availableWidth > 0 ? Math.max(14, availableWidth / totalDays) : pixelsPerDay;

  const dateToX = (date) =>
    horizontalPadding + differenceInGanttDays(timelineStart, date) * effectivePixelsPerDay;
  const contentWidth = Math.max(
    viewportWidth,
    totalDays * effectivePixelsPerDay + horizontalPadding * 2,
  );
  const groups = getTimelineGroups(items).map((group, groupIndex) => ({
    ...group,
    side: groupIndex % 2 === 0 ? 'top' : 'bottom',
    lanes: distributePixelLanes(group.items, dateToX, effectivePixelsPerDay),
  }));
  const topLaneCount = Math.max(
    0,
    ...groups.filter(({ side }) => side === 'top').map(({ lanes }) => lanes.length),
  );
  const bottomLaneCount = Math.max(
    0,
    ...groups.filter(({ side }) => side === 'bottom').map(({ lanes }) => lanes.length),
  );
  const sideLaneCount = Math.max(1, topLaneCount, bottomLaneCount);

  const headerOffset = 64;
  const availableCanvasHeight = viewportHeight > headerOffset + 60 ? viewportHeight - headerOffset - 24 : 0;

  let laneSpacing = LANE_SPACING;
  let axisClearance = AXIS_CLEARANCE;
  let canvasHeight;
  let axisY;

  if (availableCanvasHeight > 220) {
    canvasHeight = availableCanvasHeight;
    axisY = canvasHeight / 2;
    const halfHeight = axisY;
    laneSpacing = Math.max(46, Math.min(76, (halfHeight - 70) / Math.max(1, sideLaneCount)));
    axisClearance = Math.max(50, Math.min(76, halfHeight - (sideLaneCount - 1) * laneSpacing - 44));
  } else {
    axisY = CANVAS_PADDING + sideLaneCount * LANE_SPACING + AXIS_CLEARANCE;
    canvasHeight = axisY * 2;
  }

  return {
    axisClearance,
    axisY,
    canvasHeight,
    contentWidth,
    dateToX,
    groups: groups.map((group) => ({
      ...group,
      lanes: group.lanes.map((lane, laneIndex) =>
        lane.map((task) => ({
          ...task,
          y:
            group.side === 'top'
              ? axisY - axisClearance - laneIndex * laneSpacing
              : axisY + axisClearance + laneIndex * laneSpacing,
        })),
      ),
    })),
    horizontalPadding,
    laneSpacing,
    pixelsPerDay: effectivePixelsPerDay,
    ticks: getWeekTicks(timelineStart, timelineEnd, dateToX),
    timelineEnd,
    timelineStart,
    todayX: today >= timelineStart && today <= timelineEnd ? dateToX(today) : null,
  };
};
