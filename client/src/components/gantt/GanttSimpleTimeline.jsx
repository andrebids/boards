import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import { getEffectiveGanttStatus, getGanttStatusTranslationKey } from '../../constants/GanttStatuses';
import { formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';
import { getSimpleTimelineLayout, getSimpleTimelineRange } from './simpleTimelineScale';

import styles from './GanttSimpleTimeline.module.scss';

const PIXELS_PER_DAY_BY_ZOOM = {
  day: 56,
  week: 40,
  month: 32,
  quarter: 24,
};

const formatRangeLabel = (range, locale) => {
  if (!range) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const start = formatter.format(parseGanttDate(range.startDate));
  const end = formatter.format(parseGanttDate(range.endDate));

  return start === end ? start : `${start} — ${end}`;
};

const GanttSimpleTimeline = React.memo(({ items, onItemSelect, zoomLevel }) => {
  const [t, i18n] = useTranslation();
  const scrollAreaRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const locale = i18n.resolvedLanguage || i18n.language;
  const range = useMemo(() => getSimpleTimelineRange(items), [items]);
  const today = formatGanttDate(new Date());
  const layout = useMemo(
    () =>
      getSimpleTimelineLayout(items, {
        pixelsPerDay: PIXELS_PER_DAY_BY_ZOOM[zoomLevel],
        viewportWidth,
        today,
      }),
    [items, today, viewportWidth, zoomLevel],
  );

  useLayoutEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return undefined;
    }

    const updateViewportWidth = () => setViewportWidth(element.clientWidth);
    updateViewportWidth();
    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    hasCenteredRef.current = false;
  }, [layout?.timelineEnd, layout?.timelineStart, zoomLevel]);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element || !layout?.todayX || hasCenteredRef.current) {
      return;
    }

    element.scrollLeft = Math.max(0, layout.todayX - element.clientWidth / 2);
    hasCenteredRef.current = true;
  }, [layout]);

  if (!range || !layout) {
    return null;
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
  const tickFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const getItemLabel = (item) => {
    const status = getEffectiveGanttStatus(item);
    const statusKey = getGanttStatusTranslationKey(status);

    return `${item.task}. ${statusKey ? t(statusKey) : t('common.ganttStatus')}. ${dateFormatter.format(
      parseGanttDate(item.startDate),
    )} – ${dateFormatter.format(parseGanttDate(item.endDate))}`;
  };

  return (
    <section className={styles.root} aria-label={t('common.ganttSimpleTimeline')} data-testid="gantt-simple-timeline">
      <div className={styles.scrollArea} ref={scrollAreaRef}>
        <div className={styles.timeline} style={{ width: `${layout.contentWidth}px` }}>
          <header className={styles.heading}>
            <div>
              <h2>{t('common.ganttProjectTimeline')}</h2>
              <p>{formatRangeLabel(range, locale)}</p>
            </div>
          </header>

          <div className={styles.canvas} style={{ height: `${layout.canvasHeight}px` }}>
            <svg
              className={styles.diagram}
              width={layout.contentWidth}
              height={layout.canvasHeight}
              aria-hidden="true"
            >
              {layout.ticks.map((tick) => (
                <g className={styles.tick} key={tick.date} transform={`translate(${tick.x} 0)`}>
                  <line y1="0" y2={layout.canvasHeight} />
                  <text x="0" y="20">{tickFormatter.format(parseGanttDate(tick.date))}</text>
                </g>
              ))}
              {layout.todayX && (
                <g className={styles.today} transform={`translate(${layout.todayX} 0)`}>
                  <line y1="0" y2={layout.canvasHeight} />
                  <text x="0" y="42">{t('common.ganttToday')}</text>
                </g>
              )}
              <line className={styles.axis} x1="0" x2={layout.contentWidth} y1={layout.axisY} y2={layout.axisY} />
              <g className={styles.boundaryMarker} transform={`translate(${layout.dateToX(layout.timelineStart)} ${layout.axisY})`}>
                <circle r="4" />
                <text x="0" y="25">{t('common.ganttStart')}</text>
              </g>
              <g className={styles.boundaryMarker} transform={`translate(${layout.dateToX(layout.timelineEnd)} ${layout.axisY})`}>
                <circle r="4" />
                <text x="0" y="25">{t('common.ganttEnd')}</text>
              </g>
              {layout.groups.flatMap((group) =>
                group.lanes.flatMap((lane) =>
                  lane.map((task) => {
                    const status = getEffectiveGanttStatus(task);
                    const color = GANTT_STATUS_COLORS[status];

                    return (
                      <g key={task.id} style={{ '--gantt-status-color': color }}>
                        <line className={styles.connector} x1={task.startX} x2={task.startX} y1={layout.axisY} y2={task.y} />
                        <line className={styles.duration} x1={task.startX} x2={task.endX} y1={task.y} y2={task.y} />
                        <circle className={styles.taskStart} cx={task.startX} cy={task.y} r="3" />
                        <circle className={styles.taskEnd} cx={task.endX} cy={task.y} r="4" />
                      </g>
                    );
                  }),
                ),
              )}
            </svg>

            {layout.groups.map((group) => {
              const firstTask = group.lanes[0]?.[0];
              const groupY =
                group.side === 'top'
                  ? Math.max(28, layout.axisY - 80 - (group.lanes.length - 1) * 72 - 34)
                  : layout.axisY + 80 + (group.lanes.length - 1) * 72 + 18;

              return (
                <React.Fragment key={group.id}>
                  {group.label && firstTask && (
                    <span
                      className={`${styles.groupLabel} ${styles[group.side]}`}
                      style={{ left: `${firstTask.startX}px`, top: `${groupY}px` }}
                    >
                      {group.label}
                    </span>
                  )}
                  {group.lanes.flatMap((lane) =>
                    lane.map((task) => {
                      const status = getEffectiveGanttStatus(task);
                      const labelTop = group.side === 'top' ? task.y - 39 : task.y + 12;

                      return (
                        <button
                          className={`${styles.taskLabel} ${styles[group.side]}`}
                          type="button"
                          key={task.id}
                          style={{
                            '--gantt-status-color': GANTT_STATUS_COLORS[status],
                            left: `${task.startX}px`,
                            maxWidth: `${task.labelWidth}px`,
                            top: `${labelTop}px`,
                          }}
                          onClick={() => onItemSelect(task.id)}
                          aria-label={getItemLabel(task)}
                          data-gantt-item-id={task.id}
                          title={task.task}
                        >
                          <strong>{task.task}</strong>
                          <small>
                            {dateFormatter.format(parseGanttDate(task.startDate))} — {dateFormatter.format(parseGanttDate(task.endDate))}
                          </small>
                        </button>
                      );
                    }),
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});

GanttSimpleTimeline.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onItemSelect: PropTypes.func.isRequired,
  zoomLevel: PropTypes.oneOf(Object.keys(PIXELS_PER_DAY_BY_ZOOM)).isRequired,
};

export default GanttSimpleTimeline;
