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
