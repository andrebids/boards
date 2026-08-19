import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import { getEffectiveGanttStatus, getGanttStatusTranslationKey } from '../../constants/GanttStatuses';
import { formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';
import {
  getSimpleTimelineBarStyle,
  getSimpleTimelineMilestones,
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
  const milestones = useMemo(() => getSimpleTimelineMilestones(items), [items]);
  const rangeLabel = useMemo(() => {
    if (!range) {
      return '';
    }

    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const start = parseGanttDate(range.startDate);
    const end = parseGanttDate(range.endDate);
    const startLabel = formatter.format(start);
    const endLabel = formatter.format(end);

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

  const getJourneyPosition = (item) => {
    const { left } = getSimpleTimelineBarStyle(range, item);
    const timelinePosition = Number.parseFloat(left);

    return { left: `${6 + timelinePosition * 0.88}%` };
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
          style={{ minWidth: `${Math.max(740, milestones.length * 145)}px` }}
        >
          <header className={styles.heading}>
            <div>
              <h2>{t('common.ganttProjectTimeline')}</h2>
              <p>{rangeLabel}</p>
            </div>
          </header>

          <div className={styles.journey}>
            <span className={styles.journeyLine} aria-hidden="true" />
            {todayStyle && (
              <span
                className={styles.todayMarker}
                style={{ left: `${6 + Number.parseFloat(todayStyle.left) * 0.88}%` }}
                aria-hidden="true"
              >
                <span>{t('common.ganttToday')}</span>
              </span>
            )}
            {milestones.map((item) => {
              const status = getEffectiveGanttStatus(item);
              const statusKey = getGanttStatusTranslationKey(status);

              return (
                <button
                  className={`${styles.milestone} ${styles[status] || ''}`}
                  type="button"
                  key={item.id}
                  style={{ ...getJourneyPosition(item), '--gantt-status-color': GANTT_STATUS_COLORS[status] }}
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
                  <small>
                    {item.childCount > 0
                      ? t('common.ganttTaskCount', { count: item.childCount })
                      : t(statusKey || 'common.ganttStatus')}
                  </small>
                </button>
              );
            })}
          </div>

          <footer className={styles.legend} aria-label={t('common.ganttStatus')}>
            {['completed', 'inProgress', 'notStarted'].map((status) => (
              <span key={status}>
                <i style={{ '--gantt-status-color': GANTT_STATUS_COLORS[status] }} aria-hidden="true" />
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
