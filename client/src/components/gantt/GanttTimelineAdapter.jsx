/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Gantt, WillowDark } from '@svar-ui/react-gantt';
// The package exposes this stylesheet through "./all.css"; the legacy ESLint
// resolver used by this project does not understand package export maps.
// eslint-disable-next-line import/no-unresolved
import '@svar-ui/react-gantt/all.css';

import { buildGanttTaskColorStyles } from '../../constants/GanttColors';
import { formatGanttDate } from '../../utils/gantt-dates';
import createGanttCurrentTimeMarker, {
  getGanttCenteredScrollLeft,
  getGanttTitleMarqueeMetrics,
} from '../../utils/gantt-timeline';
import CardMembers from '../cards/Card/CardMembers';
import { mapGanttItemsToTimelineTasks, mapGanttLinksToTimelineLinks } from './ganttTimelineMapper';

import styles from './GanttTimelineAdapter.module.scss';

const getWeekNumber = (value) => {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

const NATIVE_ZOOM_LEVELS = ['quarter', 'month', 'week', 'day'];
const CURRENT_TIME_MARKER_REFRESH_INTERVAL = 60000;

const AssigneesCell = React.memo(({ row }) => <CardMembers userIds={row.assigneeUserIds} />);

AssigneesCell.propTypes = {
  row: PropTypes.shape({
    assigneeUserIds: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

const OverflowMarquee = React.memo(({ text, centered }) => {
  const viewportRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const label = labelRef.current;
    if (!viewport || !label) {
      return undefined;
    }

    const updateMarquee = () => {
      const labelWidth = Math.ceil(label.getBoundingClientRect().width);
      const metrics = getGanttTitleMarqueeMetrics(labelWidth, viewport.clientWidth);
      viewport.toggleAttribute('data-overflowing', Boolean(metrics));

      if (metrics) {
        viewport.style.setProperty('--gantt-title-distance', `${metrics.distance}px`);
        viewport.style.setProperty('--gantt-title-duration', `${metrics.duration}s`);
        viewport.style.setProperty('--gantt-title-gap', `${metrics.gap}px`);
      }
    };

    updateMarquee();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateMarquee);
    resizeObserver.observe(viewport);
    resizeObserver.observe(label);

    return () => resizeObserver.disconnect();
  }, [text]);

  return (
    <div
      ref={viewportRef}
      className={
        centered ? `${styles.marqueeViewport} ${styles.marqueeCentered}` : styles.marqueeViewport
      }
    >
      <div className={styles.marqueeTrack}>
        <span ref={labelRef}>{text}</span>
        <span className={styles.marqueeCopy} aria-hidden="true">
          {text}
        </span>
      </div>
    </div>
  );
});

OverflowMarquee.propTypes = {
  text: PropTypes.string.isRequired,
  centered: PropTypes.bool,
};

OverflowMarquee.defaultProps = {
  centered: false,
};

const TaskBarContent = React.memo(({ data }) => (
  <div className={styles.barContent}>
    <OverflowMarquee text={data.text} centered />
  </div>
));

const TaskTitleCell = React.memo(({ row }) => <OverflowMarquee text={row.text} />);

TaskTitleCell.propTypes = {
  row: PropTypes.shape({
    text: PropTypes.string.isRequired,
  }).isRequired,
};

TaskBarContent.propTypes = {
  data: PropTypes.shape({
    text: PropTypes.string.isRequired,
  }).isRequired,
};

const ColumnHeader = React.memo(({ cell }) => (
  <span className={cell.icon ? styles.iconHeader : styles.columnHeader} title={cell.text}>
    {cell.icon ? (
      <>
        <Icon fitted name={cell.icon} aria-hidden="true" />
        <span className={styles.visuallyHidden}>{cell.text}</span>
      </>
    ) : (
      cell.text
    )}
  </span>
));

ColumnHeader.propTypes = {
  cell: PropTypes.shape({
    icon: PropTypes.string,
    text: PropTypes.string.isRequired,
  }).isRequired,
};

const createHeader = (text, icon) => ({ text, icon, cell: ColumnHeader });

const GanttTimelineAdapter = React.memo(
  ({
    items,
    links,
    zoomLevel,
    readonly,
    variant,
    onZoomLevelChange,
    onItemSelect,
    onItemChange,
  }) => {
    const [t, i18n] = useTranslation();
    const [readyZoomLevel, setReadyZoomLevel] = useState(null);
    const locale = i18n.resolvedLanguage || i18n.language;
    const todayLabel = useMemo(() => {
      const label = new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }).format(0, 'day');
      return `${label.charAt(0).toLocaleUpperCase(locale)}${label.slice(1)}`;
    }, [locale]);
    const onItemSelectRef = useRef(onItemSelect);
    const onItemChangeRef = useRef(onItemChange);
    const onZoomLevelChangeRef = useRef(onZoomLevelChange);
    const ganttApiRef = useRef(null);
    const timelineRef = useRef(null);
    const todayLabelRef = useRef(todayLabel);
    const isDashboardWidget = variant === 'dashboard';
    todayLabelRef.current = todayLabel;
    useEffect(() => {
      onItemSelectRef.current = onItemSelect;
      onItemChangeRef.current = onItemChange;
      onZoomLevelChangeRef.current = onZoomLevelChange;
    }, [onItemChange, onItemSelect, onZoomLevelChange]);

    const zoomConfig = useMemo(() => {
      const monthYear = new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      });
      const formatDay = (date) => {
        const day = i18n.dateFns.format(date, 'd', { language: locale });
        const weekday = i18n.dateFns.format(date, 'EEE', { language: locale });
        const capitalizedWeekday = `${weekday.charAt(0).toLocaleUpperCase(locale)}${weekday.slice(1)}`;
        return `${day}\n${capitalizedWeekday}`;
      };
      const year = new Intl.DateTimeFormat(locale, { year: 'numeric' });
      const month = new Intl.DateTimeFormat(locale, { month: 'short' });
      const quarter = (date) => `Q${Math.floor(date.getMonth() / 3) + 1}`;

      return {
        day: {
          cellWidth: 36,
          minCellWidth: 28,
          maxCellWidth: 100,
          scales: [
            {
              unit: 'month',
              step: 1,
              format: (date) => monthYear.format(date),
            },
            { unit: 'day', step: 1, format: formatDay },
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
            { unit: 'month', step: 1, format: (date) => month.format(date) },
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
    }, [i18n.dateFns, locale, t]);

    const tasks = useMemo(() => mapGanttItemsToTimelineTasks(items, t), [items, t]);

    const assigneesColumnWidth = useMemo(() => {
      const maximum = Math.max(0, ...items.map((item) => item.assigneeUserIds?.length || 0));
      const visibleSlots = Math.min(4, maximum);
      return 44 + Math.max(0, visibleSlots - 1) * 18;
    }, [items]);

    const columns = useMemo(
      () => [
        {
          id: 'assignees',
          header: createHeader(t('common.ganttPerson'), 'users'),
          width: assigneesColumnWidth,
          resize: true,
          cell: AssigneesCell,
        },
        {
          id: 'text',
          header: createHeader(t('common.ganttTask')),
          width: 190,
          resize: true,
          cell: TaskTitleCell,
        },
        {
          id: 'startLabel',
          header: createHeader(t('common.ganttStart')),
          width: 64,
          align: 'center',
          resize: true,
        },
        {
          id: 'endLabel',
          header: createHeader(t('common.ganttEnd')),
          width: 64,
          align: 'center',
          resize: true,
        },
        {
          id: 'durationLabel',
          header: createHeader(t('common.ganttDuration')),
          width: 48,
          align: 'center',
        },
        {
          id: 'statusLabel',
          header: createHeader(t('common.ganttStatus')),
          width: 104,
          align: 'center',
          resize: true,
        },
      ],
      [assigneesColumnWidth, t],
    );

    const updateCurrentTimeMarker = useCallback(({ focus = false, chartWidth } = {}) => {
      const ganttApi = ganttApiRef.current;
      if (!ganttApi) {
        return;
      }

      const state = ganttApi.getState();
      const {
        _scales: scales,
        _start: scaleStart,
        _chartWidth: currentChartWidth,
        cellWidth,
      } = state;
      if (!scales || !scaleStart || !cellWidth) {
        return;
      }

      const marker = createGanttCurrentTimeMarker({
        scales,
        scaleStart,
        cellWidth,
        now: new Date(),
        text: todayLabelRef.current,
      });

      ganttApi.getStores().data.setState({ _markers: [marker] });

      const focusChartWidth =
        timelineRef.current?.querySelector('.wx-chart')?.clientWidth ||
        chartWidth ||
        currentChartWidth;
      if (focus && focusChartWidth) {
        ganttApi.exec('scroll-chart', {
          left: getGanttCenteredScrollLeft(marker.left, focusChartWidth),
        });
      }
    }, []);

    useEffect(() => {
      const intervalId = window.setInterval(
        updateCurrentTimeMarker,
        CURRENT_TIME_MARKER_REFRESH_INTERVAL,
      );

      return () => {
        window.clearInterval(intervalId);
      };
    }, [updateCurrentTimeMarker]);

    useEffect(() => {
      if (
        !isDashboardWidget ||
        readyZoomLevel !== zoomLevel ||
        typeof ResizeObserver === 'undefined'
      ) {
        return undefined;
      }

      const chart = timelineRef.current?.querySelector('.wx-chart');
      if (!chart) {
        return undefined;
      }

      const resizeObserver = new ResizeObserver(() => {
        updateCurrentTimeMarker({ focus: true, chartWidth: chart.clientWidth });
      });
      resizeObserver.observe(chart);

      return () => resizeObserver.disconnect();
    }, [isDashboardWidget, readyZoomLevel, updateCurrentTimeMarker, zoomLevel]);

    const handleInit = useCallback(
      (ganttApi) => {
        ganttApiRef.current = ganttApi;

        updateCurrentTimeMarker();
        ganttApi.on('resize-chart', ({ width }) => {
          updateCurrentTimeMarker({ focus: isDashboardWidget, chartWidth: width });
        });
        ganttApi.on('zoom-scale', () => {
          updateCurrentTimeMarker();
          const nativeZoomLevel = NATIVE_ZOOM_LEVELS[ganttApi.getState().zoom.level];
          if (nativeZoomLevel) {
            onZoomLevelChangeRef.current(nativeZoomLevel);
          }
        });

        if (!isDashboardWidget) {
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
            });
          });
        }

        window.requestAnimationFrame(() => {
          updateCurrentTimeMarker({ focus: isDashboardWidget });
          setReadyZoomLevel(zoomLevel);
        });
      },
      [isDashboardWidget, updateCurrentTimeMarker, zoomLevel],
    );

    const taskColorStyles = useMemo(() => buildGanttTaskColorStyles(tasks), [tasks]);

    const zoom = zoomConfig[zoomLevel] || zoomConfig.week;
    const highlightTime = useCallback(
      (date, unit) =>
        zoomLevel === 'day' && unit === 'day' && (date.getDay() === 0 || date.getDay() === 6)
          ? 'wx-weekend'
          : '',
      [zoomLevel],
    );
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
      <div
        ref={timelineRef}
        className={styles.wrapper}
        data-gantt-color-scope
        data-zoom-level={zoomLevel}
        style={{ visibility: readyZoomLevel === zoomLevel ? 'visible' : 'hidden' }}
      >
        <style>{taskColorStyles}</style>
        <WillowDark fonts={false}>
          <Gantt
            key={zoomLevel}
            tasks={tasks}
            taskTemplate={TaskBarContent}
            links={mapGanttLinksToTimelineLinks(links)}
            columns={columns}
            gridWidth={523 + assigneesColumnWidth}
            readonly={readonly}
            cellBorders="full"
            cellHeight={42}
            scaleHeight={54}
            lengthUnit="day"
            durationUnit="day"
            cellWidth={zoom.cellWidth}
            scales={zoom.scales}
            zoom={nativeZoom}
            highlightTime={highlightTime}
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
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
  readonly: PropTypes.bool.isRequired,
  variant: PropTypes.oneOf(['default', 'dashboard']),
  onZoomLevelChange: PropTypes.func,
  onItemSelect: PropTypes.func,
  onItemChange: PropTypes.func,
};

GanttTimelineAdapter.defaultProps = {
  variant: 'default',
  onZoomLevelChange: () => {},
  onItemSelect: () => {},
  onItemChange: () => {},
};

export default GanttTimelineAdapter;
