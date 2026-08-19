import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import {
  getEffectiveGanttStatus,
  getGanttStatusTranslationKey,
} from '../../constants/GanttStatuses';
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

  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  });
  const start = formatter.format(parseGanttDate(range.startDate));
  const end = formatter.format(parseGanttDate(range.endDate));

  return start === end ? start : `${start} — ${end}`;
};

const GanttSimpleTimeline = React.memo(({ items, onItemSelect, zoomLevel }) => {
  const [t, i18n] = useTranslation();
  const scrollAreaRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 });
  const locale = i18n.resolvedLanguage || i18n.language;
  const range = useMemo(() => getSimpleTimelineRange(items), [items]);
  const today = formatGanttDate(new Date());
  const layout = useMemo(
    () =>
      getSimpleTimelineLayout(items, {
        pixelsPerDay: PIXELS_PER_DAY_BY_ZOOM[zoomLevel],
        viewportWidth: viewportDimensions.width,
        viewportHeight: viewportDimensions.height,
        today,
      }),
    [items, today, viewportDimensions, zoomLevel],
  );

  useLayoutEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return undefined;
    }

    const updateDimensions = () => {
      setViewportDimensions({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
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

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  });
  const tickFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  });
  
  const deliveryItems = items.filter(
    ({ itemType, startDate }) =>
      itemType === 'delivery' && startDate >= layout.timelineStart && startDate <= layout.timelineEnd,
  );
  
  const milestoneItems = items.filter(
    ({ isMilestone, itemType, startDate }) =>
      isMilestone && itemType !== 'delivery' && startDate >= layout.timelineStart && startDate <= layout.timelineEnd,
  );
  const progressEndX = layout.todayX || layout.dateToX(layout.timelineStart);
  
  const getItemLabel = (item) => {
    const status = getEffectiveGanttStatus(item);
    const statusKey = getGanttStatusTranslationKey(status);

    return `${item.task}. ${statusKey ? t(statusKey) : t('common.ganttStatus')}. ${dateFormatter.format(
      parseGanttDate(item.endDate),
    )}`;
  };

  return (
    <section
      className={styles.root}
      aria-label={t('common.ganttSimpleTimeline')}
      data-testid="gantt-simple-timeline"
    >
      <div className={styles.scrollArea} ref={scrollAreaRef}>
        <div className={styles.timeline} style={{ width: `${layout.contentWidth}px` }}>
          <header className={styles.heading}>
            <div>
              <h2>{t('common.ganttProjectTimeline')}</h2>
              <p>{formatRangeLabel(range, locale)}</p>
            </div>
          </header>

          <div className={styles.canvas} style={{ height: `${layout.canvasHeight}px` }}>
            {/* SVG Elements at the bottom: Week grid and connections */}
            <svg
              className={styles.diagram}
              width={layout.contentWidth}
              height={layout.canvasHeight}
              aria-hidden="true"
            >
              {layout.ticks.map((tick) => (
                <g className={styles.tick} key={tick.date} transform={`translate(${tick.x} 0)`}>
                  <line y1="0" y2={layout.canvasHeight} />
                </g>
              ))}
              
              {layout.groups.flatMap((group) =>
                group.lanes.flatMap((lane) =>
                  lane.map((task) => {
                    const status = getEffectiveGanttStatus(task);
                    const color = GANTT_STATUS_COLORS[status];
                    const deliveryX = layout.dateToX(task.endDate);
                    const showsDeliveryConnector = task.itemType === 'task';

                    return (
                      <g key={task.id} style={{ '--gantt-status-color': color }}>
                        {showsDeliveryConnector && (
                          <line
                            className={styles.connector}
                            x1={deliveryX}
                            x2={deliveryX}
                            y1={layout.axisY}
                            y2={task.y}
                          />
                        )}
                      </g>
                    );
                  }),
                ),
              )}
            </svg>

            {/* HTML Timeline Track */}
            <div 
              className={styles.timelineTrack} 
              style={{ left: layout.horizontalPadding, width: layout.contentWidth - layout.horizontalPadding * 2, top: layout.axisY }}
            />
            
            <div 
              className={styles.timelineProgress} 
              style={{ left: layout.horizontalPadding, width: progressEndX - layout.horizontalPadding, top: layout.axisY }}
            />

            {/* Axis Ticks and Labels on top of track */}
            {layout.ticks.map((tick) => (
              <React.Fragment key={`axis-${tick.date}`}>
                <div className={styles.axisTick} style={{ left: tick.x, top: layout.axisY }} />
                <div className={styles.axisTickLabel} style={{ left: tick.x, top: layout.axisY }}>
                  {tickFormatter.format(parseGanttDate(tick.date))}
                </div>
              </React.Fragment>
            ))}

            {/* Start Node */}
            <div className={styles.startNode} style={{ left: layout.dateToX(layout.timelineStart), top: layout.axisY }}>
              <div className={styles.startNodeLabel}>{t('common.ganttStart')}</div>
            </div>
            
            {/* End Node */}
            <div className={styles.endNode} style={{ left: layout.dateToX(layout.timelineEnd), top: layout.axisY }}>
              <div className={styles.endNodeLabel}>{t('common.ganttEnd') || 'Fim do projeto'}</div>
            </div>

            {/* Today Line and Dot */}
            {layout.todayX && (
              <>
                <div className={styles.todayLine} style={{ left: layout.todayX, top: 0, height: layout.canvasHeight }} />
                <div className={styles.todayDot} style={{ left: layout.todayX, top: layout.axisY }} />
                <div className={styles.todayLabel} style={{ left: layout.todayX, top: layout.axisY }}>
                  {t('common.ganttToday')}
                </div>
              </>
            )}

            {/* Milestones */}
            {milestoneItems.map((item) => (
              <div 
                className={styles.milestoneNode} 
                key={`milestone-${item.id}`}
                style={{ left: layout.dateToX(item.startDate), top: layout.axisY }}
              >
                <div className={styles.milestoneNodeInner} />
              </div>
            ))}

            {/* Deliveries */}
            {deliveryItems.map((item, idx) => {
              const x = layout.dateToX(item.startDate);
              const status = getEffectiveGanttStatus(item);
              const isTop = idx % 2 === 0;
              
              let iconName = 'box';
              if (status === 'completed') iconName = 'check';
              else if (status === 'overdue') iconName = 'warning sign';
              else if (status === 'inProgress') iconName = 'clock outline';

              return (
                <div 
                  className={styles.deliveryMarkerWrapper} 
                  key={`delivery-${item.id}`}
                  style={{ left: x, top: layout.axisY }}
                  onClick={() => onItemSelect(item.id)}
                >
                  <div className={styles.deliveryLabelWrapper} style={{ [isTop ? 'bottom' : 'top']: 24 }}>
                    {!isTop && <div className={styles.deliveryLine} style={{ height: 16 }} />}
                    <div className={styles.deliveryLabel}>
                      <span className={`${styles.deliveryLabelBadge} ${styles[status] || ''}`.trim()}>
                        ENTREGA
                      </span>
                      <span className={styles.deliveryLabelTitle}>{item.task}</span>
                      <span className={styles.deliveryLabelDate}>
                        {dateFormatter.format(parseGanttDate(item.startDate))}
                      </span>
                    </div>
                    {isTop && <div className={styles.deliveryLine} style={{ height: 16 }} />}
                  </div>
                  
                  <div className={`${styles.deliveryMarker} ${styles[status] || ''}`.trim()}>
                    <div className={styles.deliveryMarkerIcon}>
                      <Icon fitted name={iconName} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Task Labels and Groups */}
            {layout.groups.map((group) => {
              const firstTask = group.lanes[0]?.[0];
              const groupY =
                group.side === 'top'
                  ? Math.max(10, layout.axisY - layout.axisClearance - (group.lanes.length - 1) * layout.laneSpacing - 44)
                  : Math.min(layout.canvasHeight - 32, layout.axisY + layout.axisClearance + (group.lanes.length - 1) * layout.laneSpacing + 36);

              return (
                <React.Fragment key={group.id}>
                  {group.label && firstTask && (
                    <span
                      className={`${styles.groupLabel} ${styles[group.side]}`}
                      style={{
                        left: `${firstTask.startX}px`,
                        top: `${groupY}px`,
                      }}
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
                            left: `${layout.dateToX(task.endDate)}px`,
                            maxWidth: `${task.labelWidth}px`,
                            top: `${labelTop}px`,
                          }}
                          onClick={() => onItemSelect(task.id)}
                          aria-label={getItemLabel(task)}
                          data-gantt-item-id={task.id}
                          title={task.task}
                        >
                          <strong>{task.task}</strong>
                          <small>{dateFormatter.format(parseGanttDate(task.endDate))}</small>
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
