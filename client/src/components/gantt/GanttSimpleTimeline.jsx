import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import { getEffectiveGanttStatus, getGanttStatusTranslationKey } from '../../constants/GanttStatuses';
import { differenceInGanttDays, formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';
import {
  getSimpleTimelineBarStyle,
  getSimpleTimelineDays,
  getSimpleTimelineRange,
  groupSimpleTimelineItems,
} from './simpleTimelineScale';

import styles from './GanttSimpleTimeline.module.scss';

const DAY_WIDTHS = {
  day: 46,
  week: 18,
  month: 7,
  quarter: 4,
};

const getWeekNumber = (value) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

const isScaleLabelStart = (date, zoomLevel) => {
  if (zoomLevel === 'day') {
    return true;
  }

  if (zoomLevel === 'week') {
    return date.getDay() === 1;
  }

  if (zoomLevel === 'month') {
    return date.getDate() === 1;
  }

  return date.getDate() === 1 && date.getMonth() % 3 === 0;
};

const getScaleLabel = (date, zoomLevel, locale, t) => {
  if (zoomLevel === 'day') {
    return new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date);
  }

  if (zoomLevel === 'week') {
    return `${t('common.ganttWeekShort')}${getWeekNumber(date)}`;
  }

  if (zoomLevel === 'month') {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
  }

  return `T${Math.floor(date.getMonth() / 3) + 1}`;
};

const getMonthGroups = (days, locale) => {
  const monthGroups = [];

  days.forEach((value) => {
    const date = parseGanttDate(value);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const current = monthGroups.at(-1);

    if (current?.key === key) {
      current.span += 1;
      return;
    }

    monthGroups.push({
      key,
      span: 1,
      label: new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date),
    });
  });

  return monthGroups;
};

const GanttSimpleTimeline = React.memo(({ items, zoomLevel, onItemSelect }) => {
  const [t, i18n] = useTranslation();
  const range = useMemo(() => getSimpleTimelineRange(items), [items]);
  const days = useMemo(() => getSimpleTimelineDays(range), [range]);
  const itemsById = useMemo(() => Object.fromEntries(items.map((item) => [item.id, item])), [items]);
  const groups = useMemo(() => groupSimpleTimelineItems(items), [items]);
  const locale = i18n.resolvedLanguage || i18n.language;
  const monthGroups = useMemo(() => getMonthGroups(days, locale), [days, locale]);
  const width = `${Math.max(420, days.length * DAY_WIDTHS[zoomLevel])}px`;
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
    const statusLabel = statusKey ? t(statusKey) : t('common.ganttStatus');
    const interval = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

    return `${item.task}. ${statusLabel}. ${interval.format(parseGanttDate(item.startDate))} – ${interval.format(parseGanttDate(item.endDate))}`;
  };

  const renderTask = (item) => {
    const status = getEffectiveGanttStatus(item);
    const barStyle = getSimpleTimelineBarStyle(range, item);

    return (
      <div className={styles.taskRow} key={item.id}>
        <button
          className={styles.taskBar}
          type="button"
          style={{ ...barStyle, '--gantt-status-color': GANTT_STATUS_COLORS[status] }}
          onClick={() => onItemSelect(item.id)}
          aria-label={getItemLabel(item)}
          data-gantt-item-id={item.id}
          title={`${item.task} · ${item.startDate} — ${item.endDate}`}
        >
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.taskTitle}>{item.task}</span>
        </button>
      </div>
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
          style={{ width, '--simple-timeline-columns': days.length }}
        >
          <header className={styles.scaleHeader}>
            <div className={styles.monthRow}>
              {monthGroups.map(({ key, label, span }) => (
                <span key={key} style={{ gridColumn: `span ${span}` }}>
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.scaleRow}>
              {days.map((value) => {
                const date = parseGanttDate(value);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const isLabelStart = isScaleLabelStart(date, zoomLevel);

                return (
                  <span
                    className={isWeekend && zoomLevel === 'day' ? styles.weekendCell : undefined}
                    key={value}
                  >
                    {isLabelStart && getScaleLabel(date, zoomLevel, locale, t)}
                  </span>
                );
              })}
            </div>
          </header>

          {todayStyle && (
            <span className={styles.todayMarker} style={{ left: todayStyle.left }} aria-hidden="true">
              <span>{t('common.ganttToday')}</span>
            </span>
          )}

          <div className={styles.groups}>
              {groups.map(({ summaryId, itemIds }) => {
              const summary = summaryId ? itemsById[summaryId] : null;

              return (
                <section className={styles.phase} key={summaryId || 'independent'}>
                  <div className={styles.phaseHeader}>
                    <Icon name={summary ? 'folder open outline' : 'circle outline'} aria-hidden="true" />
                    <span>{summary ? summary.task : t('common.ganttUnphased')}</span>
                    {summary && (
                      <span className={styles.phaseRange}>
                        {summary.startDate} — {summary.endDate}
                      </span>
                    )}
                  </div>
                  {itemIds.map((id) => renderTask(itemsById[id]))}
                </section>
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
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
  onItemSelect: PropTypes.func.isRequired,
};

export default GanttSimpleTimeline;
