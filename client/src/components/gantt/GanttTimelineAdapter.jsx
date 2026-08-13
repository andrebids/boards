/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Gantt, WillowDark } from '@svar-ui/react-gantt';
// The package exposes this stylesheet through "./all.css"; the legacy ESLint
// resolver used by this project does not understand package export maps.
// eslint-disable-next-line import/no-unresolved
import '@svar-ui/react-gantt/all.css';

import { addGanttDays, formatGanttDate, parseGanttDate } from '../../utils/gantt-dates';

import styles from './GanttTimelineAdapter.module.scss';

const getWeekNumber = (value) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

const NATIVE_ZOOM_LEVELS = ['quarter', 'month', 'week', 'day'];

const GanttTimelineAdapter = React.memo(
  ({ items, links, usersById, zoomLevel, readonly, onItemSelect, onItemChange }) => {
    const [t, i18n] = useTranslation();
    const locale = i18n.resolvedLanguage || i18n.language;
    const onItemSelectRef = useRef(onItemSelect);
    const onItemChangeRef = useRef(onItemChange);
    const wrapperRef = useRef(null);

    useEffect(() => {
      onItemSelectRef.current = onItemSelect;
      onItemChangeRef.current = onItemChange;
    }, [onItemChange, onItemSelect]);

    const zoomConfig = useMemo(() => {
      const monthYear = new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      });
      const day = new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
      });
      const year = new Intl.DateTimeFormat(locale, { year: 'numeric' });
      const month = new Intl.DateTimeFormat(locale, { month: 'short' });
      const quarter = (date) => `Q${Math.floor(date.getMonth() / 3) + 1}`;

      return {
        day: {
          cellWidth: 42,
          minCellWidth: 28,
          maxCellWidth: 100,
          scales: [
            {
              unit: 'month',
              step: 1,
              format: (date) => monthYear.format(date),
              css: (date) =>
                date.getMonth() % 2 === 1 ? styles.monthBand : styles.monthBandAlternate,
            },
            { unit: 'day', step: 1, format: (date) => day.format(date) },
          ],
        },
        week: {
          // SVAR applies cellWidth to the smallest scale unit. A week therefore
          // needs seven daily widths to keep multi-day bars readable.
          cellWidth: 126,
          minCellWidth: 70,
          maxCellWidth: 210,
          scales: [
            {
              unit: 'month',
              step: 1,
              format: (date) => monthYear.format(date),
              css: (date) =>
                date.getMonth() % 2 === 1 ? styles.monthBand : styles.monthBandAlternate,
            },
            {
              unit: 'week',
              step: 1,
              format: (date) => `${t('common.ganttWeekShort')}${getWeekNumber(date)}`,
            },
          ],
        },
        month: {
          // Roughly five pixels per day while retaining calendar-aware months.
          cellWidth: 150,
          minCellWidth: 80,
          maxCellWidth: 240,
          scales: [
            { unit: 'year', step: 1, format: (date) => year.format(date) },
            {
              unit: 'month',
              step: 1,
              format: (date) => month.format(date),
              css: (date) =>
                date.getMonth() % 2 === 1 ? styles.monthBand : styles.monthBandAlternate,
            },
          ],
        },
        quarter: {
          cellWidth: 240,
          minCellWidth: 140,
          maxCellWidth: 360,
          scales: [
            { unit: 'year', step: 1, format: (date) => year.format(date) },
            { unit: 'quarter', step: 1, format: quarter },
          ],
        },
      };
    }, [locale, t]);

    const tasks = useMemo(
      () =>
        items.map((item) => ({
          id: item.id,
          text: item.task,
          start: parseGanttDate(item.startDate),
          end: parseGanttDate(addGanttDays(item.endDate, 1)),
          duration: item.expectedDurationDays,
          type: item.itemType || 'task',
          parent: item.parentId || 0,
          ...(item.itemType === 'summary' && { open: true }),
          progress: item.progress || 0,
          details: item.description || '',
          color: item.color || 'blue',
          assignees: (item.assigneeUserIds || [])
            .map((userId) => usersById[userId]?.name)
            .filter(Boolean)
            .join(', '),
          startLabel: item.startDate,
          endLabel: item.endDate,
          durationLabel: t('common.ganttDayShort', { count: item.expectedDurationDays }),
          statusLabel: item.status || '—',
        })),
      [items, t, usersById],
    );

    const columns = useMemo(
      () => [
        {
          id: 'assignees',
          header: t('common.ganttPerson'),
          width: 110,
          resize: true,
        },
        { id: 'text', header: t('common.ganttTask'), width: 190, resize: true },
        {
          id: 'startLabel',
          header: t('common.ganttStart'),
          width: 80,
          resize: true,
        },
        {
          id: 'endLabel',
          header: t('common.ganttEnd'),
          width: 80,
          resize: true,
        },
        {
          id: 'durationLabel',
          header: t('common.ganttDuration'),
          width: 65,
          align: 'right',
        },
        {
          id: 'statusLabel',
          header: t('common.ganttStatus'),
          width: 104,
          resize: true,
        },
        {
          id: 'progress',
          header: t('common.ganttProgress'),
          width: 72,
          align: 'right',
        },
      ],
      [t],
    );

    const handleInit = useCallback((ganttApi) => {
      ganttApi.on('select-task', ({ id }) => {
        onItemSelectRef.current(String(id));
      });

      ganttApi.on('update-task', ({ id, inProgress }) => {
        if (inProgress) {
          return;
        }

        const task = ganttApi.getTask(id);
        if (!task?.start || !task?.end) {
          return;
        }

        onItemChangeRef.current(String(id), {
          startDate: formatGanttDate(task.start),
          endDate: formatGanttDate(new Date(task.end.getTime() - 86400000)),
          expectedDurationDays: Math.max(1, Math.round(task.duration || 1)),
          progress: Math.max(0, Math.min(100, Math.round(task.progress || 0))),
        });
      });
    }, []);

    useEffect(() => {
      const colors = {
        blue: '#3983eb',
        green: '#2fa36b',
        orange: '#d9822b',
        red: '#d64545',
        purple: '#8b5cf6',
        teal: '#0f9f9a',
        gray: '#697386',
      };
      const frame = requestAnimationFrame(() => {
        wrapperRef.current?.querySelectorAll('.wx-bar[data-task-id]').forEach((element) => {
          const task = tasks.find(({ id }) => String(id) === element.dataset.taskId);
          const color = colors[task?.color] || colors.blue;
          const prefix = task?.type === 'summary' ? 'summary' : 'task';
          element.style.setProperty(`--wx-gantt-${prefix}-color`, color);
          element.style.setProperty(`--wx-gantt-${prefix}-fill-color`, color);
          element.style.setProperty(`--wx-gantt-${prefix}-border-color`, color);
        });
      });
      return () => cancelAnimationFrame(frame);
    }, [tasks, zoomLevel]);

    const zoom = zoomConfig[zoomLevel] || zoomConfig.week;
    const nativeZoom = useMemo(
      () => ({
        level: NATIVE_ZOOM_LEVELS.indexOf(zoomLevel),
        levels: NATIVE_ZOOM_LEVELS.map((level) => ({
          minCellWidth: zoomConfig[level].minCellWidth,
          maxCellWidth: zoomConfig[level].maxCellWidth,
          scales: zoomConfig[level].scales,
        })),
      }),
      [zoomConfig, zoomLevel],
    );

    return (
      <div ref={wrapperRef} className={styles.wrapper}>
        <WillowDark fonts={false}>
          <Gantt
            key={zoomLevel}
            tasks={tasks}
            links={links.map(({ id, sourceItemId, targetItemId, type }) => ({
              id,
              source: sourceItemId,
              target: targetItemId,
              type,
            }))}
            columns={columns}
            gridWidth={650}
            readonly={readonly}
            cellBorders="full"
            cellHeight={42}
            scaleHeight={54}
            lengthUnit="day"
            durationUnit="day"
            cellWidth={zoom.cellWidth}
            scales={zoom.scales}
            zoom={nativeZoom}
            autoScale
            init={handleInit}
          />
        </WillowDark>
      </div>
    );
  },
);

GanttTimelineAdapter.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  links: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  usersById: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
  readonly: PropTypes.bool.isRequired,
  onItemSelect: PropTypes.func.isRequired,
  onItemChange: PropTypes.func.isRequired,
};

export default GanttTimelineAdapter;
