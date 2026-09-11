import {
  addGanttDays,
  differenceInGanttDays,
  formatGanttDate,
  parseGanttDate,
  updateGanttSchedule,
} from './gantt-dates';

export const GANTT_ITEM_DRAG_TYPE = 'application/x-planka-gantt-item';

// Invert the same SVAR scale used to draw bars, without assuming equal month widths.
export const getGanttDropSchedule = ({ x, scales, cellWidth, expectedDurationDays }) => {
  if (!scales || !cellWidth || x < 0 || x >= scales.width) return null;
  const firstDay = formatGanttDate(scales.start);
  const position = (day) => scales.diff(parseGanttDate(day), scales.start, 'hour') * cellWidth;
  let low = 0;
  let high = differenceInGanttDays(firstDay, formatGanttDate(scales.end));
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (position(addGanttDays(firstDay, middle)) <= x + 0.000001) low = middle;
    else high = middle - 1;
  }
  const schedule = updateGanttSchedule(
    { expectedDurationDays },
    {
      startDate: addGanttDays(firstDay, low),
    },
  );
  const left = position(schedule.startDate);
  return {
    ...schedule,
    left,
    width: position(addGanttDays(schedule.endDate, 1)) - left,
  };
};

const GANTT_TITLE_MARQUEE_GAP = 24;
const GANTT_TITLE_MARQUEE_SPEED = 32;

export const getGanttTitleMarqueeMetrics = (labelWidth, viewportWidth) => {
  if (labelWidth <= viewportWidth) {
    return null;
  }

  const distance = Math.ceil(labelWidth) + GANTT_TITLE_MARQUEE_GAP;
  return {
    distance,
    duration: distance / GANTT_TITLE_MARQUEE_SPEED,
    gap: GANTT_TITLE_MARQUEE_GAP,
  };
};

export const getGanttCenteredScrollLeft = (markerLeft, chartWidth) =>
  Math.max(0, Math.round(markerLeft - chartWidth / 2));

const createGanttCurrentTimeMarker = ({ scales, scaleStart, cellWidth, now, text }) => ({
  left: Math.round(scales.diff(now, scaleStart, 'hour') * cellWidth),
  start: now,
  text,
});

export default createGanttCurrentTimeMarker;
