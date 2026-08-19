export const selectItemsById = (items) => Object.fromEntries(items.map((item) => [item.id, item]));

export const selectGeneralItems = (items) => items.filter(({ itemType }) => itemType === 'summary');

export const selectTimelineData = (items, links = []) => {
  const childrenByParentId = items.reduce((result, item) => {
    if (item.parentId) {
      (result[item.parentId] ||= []).push(item);
    }
    return result;
  }, {});
  const timelineItems = items.flatMap((item) => {
    if (item.itemType !== 'summary') {
      return item.startDate ? [item] : [];
    }

    const scheduledChildren = (childrenByParentId[item.id] || []).filter(({ startDate }) => startDate);
    if (scheduledChildren.length === 0) {
      return [];
    }

    return [{
      ...item,
      startDate: scheduledChildren.map(({ startDate }) => startDate).sort()[0],
      endDate: scheduledChildren.map(({ endDate }) => endDate).sort().at(-1),
      expectedDurationDays: scheduledChildren.reduce((total, child) => total + child.expectedDurationDays, 0),
    }];
  });
  const timelineItemIds = new Set(timelineItems.map(({ id }) => id));

  return {
    timelineItems,
    timelineLinks: links.filter(
      ({ sourceItemId, targetItemId }) =>
        timelineItemIds.has(sourceItemId) && timelineItemIds.has(targetItemId),
    ),
    unscheduledItems: items.filter(({ itemType, startDate }) => (itemType === 'task' || itemType === 'delivery') && !startDate),
  };
};
