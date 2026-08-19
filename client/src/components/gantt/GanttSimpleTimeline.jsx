import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import {
  getEffectiveGanttStatus,
  getGanttStatusTranslationKey,
} from '../../constants/GanttStatuses';
import { formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';
import {
  getSimpleTimelineBarStyle,
  getSimpleTimelineHierarchy,
  getSimpleTimelineRange,
} from './simpleTimelineScale';

import styles from './GanttSimpleTimeline.module.scss';

const ICONS_BY_STATUS = {
  completed: 'check',
  inProgress: 'star',
  notStarted: 'circle outline',
  testing: 'flask',
};

const GanttSimpleTimeline = React.memo(({ items, onItemSelect }) => {
  const [t, i18n] = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const range = useMemo(() => getSimpleTimelineRange(items), [items]);
  const hierarchy = useMemo(() => getSimpleTimelineHierarchy(items), [items]);
  const itemsById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );
  const rangeLabel = useMemo(() => {
    if (!range) {
      return '';
    }

    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const startLabel = formatter.format(parseGanttDate(range.startDate));
    const endLabel = formatter.format(parseGanttDate(range.endDate));

    return startLabel === endLabel ? startLabel : `${startLabel} — ${endLabel}`;
  }, [locale, range]);
  const today = formatGanttDate(new Date());
  const todayStyle =
    today >= range?.startDate && today <= range?.endDate
      ? getSimpleTimelineBarStyle(range, { startDate: today, endDate: today })
      : null;

  if (!range) {
    return null;
  }

  const getItemLabel = (item) => {
    const status = getEffectiveGanttStatus(item);
    const statusKey = getGanttStatusTranslationKey(status);
    const interval = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

    return `${item.task}. ${statusKey ? t(statusKey) : t('common.ganttStatus')}. ${interval.format(
      parseGanttDate(item.startDate),
    )} – ${interval.format(parseGanttDate(item.endDate))}`;
  };

  const getTimelineStyle = (item) => {
    const { left, width } = getSimpleTimelineBarStyle(range, item);
    const timelineLeft = Number.parseFloat(left);
    const timelineWidth = Number.parseFloat(width);

    return {
      left: `${6 + timelineLeft * 0.88}%`,
      width: `${timelineWidth * 0.88}%`,
    };
  };

  const getMarkerStyle = (item) => {
    const { left } = getTimelineStyle(item);

    return { left };
  };

  const renderTaskBar = (item) => {
    const status = getEffectiveGanttStatus(item);
    const period = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });

    return (
      <button
        className={styles.childTask}
        type="button"
        key={item.id}
        style={{ ...getTimelineStyle(item), '--gantt-status-color': GANTT_STATUS_COLORS[status] }}
        onClick={() => onItemSelect(item.id)}
        aria-label={getItemLabel(item)}
        data-gantt-item-id={item.id}
      >
        <span className={styles.childTaskLine} aria-hidden="true" />
        <span className={styles.childTaskLabel}>
          <span>
            <i className={styles.childTaskDot} aria-hidden="true" />
            {item.task}
          </span>
          <small>
            {period.format(parseGanttDate(item.startDate))} —{' '}
            {period.format(parseGanttDate(item.endDate))}
          </small>
        </span>
      </button>
    );
  };

  return (
    <section
      className={styles.root}
      aria-label={t('common.ganttSimpleTimeline')}
      data-testid="gantt-simple-timeline"
    >
      <div className={styles.scrollArea}>
        <div
          className={styles.timeline}
          style={{ minWidth: `${Math.max(740, items.length * 130)}px` }}
        >
          <header className={styles.heading}>
            <div>
              <h2>{t('common.ganttProjectTimeline')}</h2>
              <p>{rangeLabel}</p>
            </div>
          </header>

          <div className={styles.primaryJourney}>
            <span className={styles.journeyLine} aria-hidden="true" />
            {todayStyle && (
              <span
                className={styles.todayMarker}
                style={getMarkerStyle({ startDate: today, endDate: today })}
                aria-hidden="true"
              >
                <span>{t('common.ganttToday')}</span>
              </span>
            )}
            {hierarchy.primaryItems.map((item) => {
              const status = getEffectiveGanttStatus(item);
              const statusKey = getGanttStatusTranslationKey(status);

              return (
                <button
                  className={`${styles.milestone} ${styles[status] || ''}`}
                  type="button"
                  key={item.id}
                  style={{
                    ...getMarkerStyle(item),
                    '--gantt-status-color': GANTT_STATUS_COLORS[status],
                  }}
                  onClick={() => onItemSelect(item.id)}
                  aria-label={getItemLabel(item)}
                  data-gantt-item-id={item.id}
                >
                  <time>
                    {new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(
                      parseGanttDate(item.startDate),
                    )}
                  </time>
                  <span className={styles.marker} aria-hidden="true">
                    <Icon name={ICONS_BY_STATUS[status] || ICONS_BY_STATUS.notStarted} />
                  </span>
                  <strong>{item.task}</strong>
                  <small>{statusKey ? t(statusKey) : t('common.ganttStatus')}</small>
                </button>
              );
            })}
          </div>

          {hierarchy.childGroups.length > 0 && (
            <section className={styles.childTracks} aria-label={t('common.ganttTask')}>
              {hierarchy.childGroups.map(({ parentId, lanes }) => (
                <section className={styles.childGroup} key={parentId}>
                  <h3>{itemsById[parentId].task}</h3>
                  {lanes.map((lane) => (
                    <div className={styles.childLane} key={`${parentId}-${lane.join('-')}`}>
                      {lane.map((itemId) => renderTaskBar(itemsById[itemId]))}
                    </div>
                  ))}
                </section>
              ))}
            </section>
          )}

          <footer className={styles.legend} aria-label={t('common.ganttStatus')}>
            {['completed', 'inProgress', 'notStarted'].map((status) => (
              <span key={status}>
                <i
                  style={{ '--gantt-status-color': GANTT_STATUS_COLORS[status] }}
                  aria-hidden="true"
                />
                {t(getGanttStatusTranslationKey(status))}
              </span>
            ))}
          </footer>
        </div>
      </div>
    </section>
  );
});

GanttSimpleTimeline.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onItemSelect: PropTypes.func.isRequired,
};

export default GanttSimpleTimeline;
