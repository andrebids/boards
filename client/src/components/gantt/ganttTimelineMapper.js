import { getEffectiveGanttStatus, getGanttStatusTranslationKey } from '../../constants/GanttStatuses';
import { addGanttDays, parseGanttDate } from '../../utils/gantt-dates';

const formatDateLabel = (value) => {
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year.slice(-2)}`;
};

export const mapGanttItemsToTimelineTasks = (items, t) =>
  items.map((item) => {
    const status = getEffectiveGanttStatus(item);
    const translationKey = getGanttStatusTranslationKey(status);

    return {
      id: item.id,
      text: item.task,
      start: parseGanttDate(item.startDate),
      end: parseGanttDate(addGanttDays(item.endDate, 1)),
      duration: item.expectedDurationDays,
      type: item.itemType || 'task',
      parent: item.parentId || 0,
      ...(item.itemType === 'summary' && { open: true }),
      details: item.description || '',
      status,
      assigneeUserIds: item.assigneeUserIds || [],
      startLabel: formatDateLabel(item.startDate),
      endLabel: formatDateLabel(item.endDate),
      durationLabel: t('common.ganttDayShort', { count: item.expectedDurationDays }),
      statusLabel: translationKey ? t(translationKey) : '—',
    };
  });

export const mapGanttLinksToTimelineLinks = (links) =>
  links.map(({ id, sourceItemId, targetItemId, type }) => ({
    id,
    source: sourceItemId,
    target: targetItemId,
    type,
  }));
