/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Gantt, WillowDark } from '@svar-ui/react-gantt';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getID } from '@svar-ui/lib-dom';
// The package exposes this stylesheet through "./all.css"; the legacy ESLint
// resolver used by this project does not understand package export maps.
// eslint-disable-next-line import/no-unresolved
import '@svar-ui/react-gantt/all.css';

import { buildGanttTaskColorStyles } from '../../constants/GanttColors';
import {
  addGanttDays,
  formatGanttDate,
  parseGanttDate,
  updateGanttSchedule,
} from '../../utils/gantt-dates';
import createGanttCurrentTimeMarker, {
  getGanttCenteredScrollLeft,
  getGanttDropSchedule,
  GANTT_ITEM_DRAG_TYPE,
  getGanttTitleMarqueeMetrics,
} from '../../utils/gantt-timeline';
import CardMembers from '../cards/Card/CardMembers';
import useGanttRowDrag from './useGanttRowDrag';
import { getGanttListDropChanges } from './ganttRowMove';
import {
  mapGanttItemsToTimelineTasks,
  mapGanttLinksToTimelineLinks,
  mapTimelineTaskDateChanges,
} from './ganttTimelineMapper';

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

const TaskTitleCell = React.memo(({ row }) => {
  const [t] = useTranslation();
  return (
    <span
      className={styles.titleCell}
      title={row.canReorder ? t('common.ganttRowMoveHelp', { task: row.text }) : row.text}
    >
      {row.text}
    </span>
  );
});

TaskTitleCell.propTypes = {
  row: PropTypes.shape({
    text: PropTypes.string.isRequired,
    canReorder: PropTypes.bool,
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
    moveItems,
    onItemMove,
    draggedItem,
    onItemSchedule,
  }) => {
    const [t, i18n] = useTranslation();
    const [readyZoomLevel, setReadyZoomLevel] = useState(null);
    const [dropPreview, setDropPreview] = useState(null);
    const [rowRevision, setRowRevision] = useState(0);
    const timelineRef = useRef(null);
    const resetRows = useCallback(() => setRowRevision((value) => value + 1), []);
    const rowDrag = useGanttRowDrag({
      items: moveItems || items,
      readonly: readonly || variant === 'dashboard',
      onMove: onItemMove,
      onReset: resetRows,
      containerRef: timelineRef,
    });
    const { init: initRowDrag } = rowDrag;
    const locale = i18n.resolvedLanguage || i18n.language;
    const todayLabel = useMemo(() => {
      const label = new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }).format(0, 'day');
      return `${label.charAt(0).toLocaleUpperCase(locale)}${label.slice(1)}`;
    }, [locale]);
    const onItemSelectRef = useRef(onItemSelect);
    const onItemChangeRef = useRef(onItemChange);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const onZoomLevelChangeRef = useRef(onZoomLevelChange);
    const ganttApiRef = useRef(null);
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

    const expandedRef = useRef(new Map());
    const previousIdsRef = useRef(new Set(items.map(({ id }) => id)));
    // A newly scheduled child must be visible even when its parent was collapsed.
    const tasks = useMemo(() => {
      const byId = new Map(items.map((item) => [item.id, item]));
      items
        .filter(({ id }) => !previousIdsRef.current.has(id))
        .forEach((item) => {
          let parent = byId.get(item.parentId);
          const visited = new Set();
          while (parent && !visited.has(parent.id)) {
            visited.add(parent.id);
            expandedRef.current.set(parent.id, true);
            parent = byId.get(parent.parentId);
          }
        });
      previousIdsRef.current = new Set(byId.keys());
      return mapGanttItemsToTimelineTasks(items, t, expandedRef.current).map((task) => ({
        ...task,
        canReorder: !readonly && !isDashboardWidget,
      }));
    }, [items, t, zoomLevel, rowRevision, readonly, isDashboardWidget]); // eslint-disable-line react-hooks/exhaustive-deps

    const emptyRange = useMemo(() => {
      const today = formatGanttDate(new Date());
      return {
        start: parseGanttDate(addGanttDays(today, -14)),
        end: parseGanttDate(addGanttDays(today, 60)),
      };
    }, []);

    useEffect(() => {
      const wrapper = timelineRef.current;
      setDropPreview(null);
      if (!wrapper || !draggedItem || readonly || isDashboardWidget) return undefined;
      const clearPreview = () => setDropPreview(null);
      const getPreview = (event) => {
        const chart = wrapper.querySelector('.wx-chart');
        const state = ganttApiRef.current?.getState();
        if (!chart || !state) return null;
        const bounds = chart.getBoundingClientRect();
        const { _scales: scales } = state;
        if (!scales) return null;
        const bodyTop = bounds.top + scales.height + 1;
        const wrapperBounds = wrapper.getBoundingClientRect();
        if (
          event.clientX >= wrapperBounds.left &&
          event.clientX < bounds.left &&
          event.clientY >= bodyTop &&
          event.clientY < bounds.top + chart.clientHeight
        ) {
          const row = event.target.closest('.wx-table [role="row"][data-id]');
          const target = row && items.find(({ id }) => id === getID(row));
          const rowBounds = row?.getBoundingClientRect();
          const titleBounds = row?.querySelector('.wx-text')?.getBoundingClientRect();
          let mode = 'after';
          if (rowBounds && event.clientY < rowBounds.top + rowBounds.height * 0.25) mode = 'before';
          else if (
            rowBounds &&
            event.clientY < rowBounds.bottom - rowBounds.height * 0.25 &&
            titleBounds &&
            event.clientX >= titleBounds.left + 20 &&
            event.clientX <= titleBounds.right
          )
            mode = 'child';
          const changes = getGanttListDropChanges(
            moveItems || items,
            draggedItem.id,
            target?.id,
            mode,
          );
          const schedule = updateGanttSchedule(draggedItem, {
            startDate: target?.startDate || formatGanttDate(new Date()),
          });
          return {
            kind: 'list',
            valid: Boolean(changes),
            mode,
            target: target?.task,
            changes: {
              ...changes,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              expectedDurationDays: schedule.expectedDurationDays,
            },
            left: titleBounds
              ? titleBounds.left - wrapperBounds.left + (mode === 'child' ? 20 : 0)
              : 44,
            top: rowBounds
              ? (mode === 'before' ? rowBounds.top : rowBounds.bottom) - wrapperBounds.top
              : event.clientY - wrapperBounds.top,
            width: bounds.left - wrapperBounds.left,
            parentTop: rowBounds ? rowBounds.top - wrapperBounds.top : 0,
            parentHeight: rowBounds?.height || 0,
          };
        }
        if (
          event.clientX < bounds.left ||
          event.clientX >= bounds.left + chart.clientWidth ||
          event.clientY < bodyTop ||
          event.clientY >= bounds.top + chart.clientHeight
        )
          return null;
        const schedule = getGanttDropSchedule({
          x: event.clientX - bounds.left + chart.scrollLeft,
          scales,
          cellWidth: state.cellWidth,
          expectedDurationDays: draggedItem.expectedDurationDays,
        });
        if (!schedule) return null;
        return {
          ...schedule,
          left: schedule.left - chart.scrollLeft,
          top: Math.max(
            0,
            Math.floor((event.clientY - bodyTop + chart.scrollTop) / state.cellHeight) *
              state.cellHeight -
              chart.scrollTop,
          ),
          chartLeft: bounds.left - wrapperBounds.left,
          chartTop: bodyTop - wrapperBounds.top,
          chartWidth: chart.clientWidth,
          chartHeight: chart.clientHeight - scales.height - 1,
        };
      };
      const dragOver = (event) => {
        if (!event.dataTransfer.types.includes(GANTT_ITEM_DRAG_TYPE)) return;
        event.stopPropagation();
        const preview = getPreview(event);
        event.preventDefault();
        const { dataTransfer } = event;
        dataTransfer.dropEffect = preview && preview.valid !== false ? 'move' : 'none';
        setDropPreview(preview);
      };
      const drop = (event) => {
        if (event.dataTransfer.getData(GANTT_ITEM_DRAG_TYPE) !== draggedItem.id) return;
        event.stopPropagation();
        const preview = getPreview(event);
        event.preventDefault();
        clearPreview();
        if (
          !preview ||
          preview.valid === false ||
          event.dataTransfer.getData(GANTT_ITEM_DRAG_TYPE) !== draggedItem.id
        )
          return;
        onItemSchedule(
          draggedItem.id,
          preview.kind === 'list'
            ? preview.changes
            : {
                startDate: preview.startDate,
                endDate: preview.endDate,
                expectedDurationDays: preview.expectedDurationDays,
              },
        );
      };
      const leave = (event) => {
        if (!wrapper.contains(event.relatedTarget)) clearPreview();
      };
      const escape = (event) => {
        if (event.key === 'Escape') clearPreview();
      };
      // The grid handles its own HTML drops; reserve only our external item MIME type.
      wrapper.addEventListener('dragenter', dragOver, true);
      wrapper.addEventListener('dragover', dragOver, true);
      wrapper.addEventListener('drop', drop, true);
      wrapper.addEventListener('dragleave', leave);
      document.addEventListener('keydown', escape);
      document.addEventListener('dragend', clearPreview);
      return () => {
        wrapper.removeEventListener('dragenter', dragOver, true);
        wrapper.removeEventListener('dragover', dragOver, true);
        wrapper.removeEventListener('drop', drop, true);
        wrapper.removeEventListener('dragleave', leave);
        document.removeEventListener('keydown', escape);
        document.removeEventListener('dragend', clearPreview);
      };
    }, [draggedItem, readonly, isDashboardWidget, onItemSchedule, zoomLevel, items, moveItems]);

    const assigneesColumnWidth = useMemo(() => {
      const maximum = Math.max(0, ...items.map((item) => item.assigneeUserIds?.length || 0));
      const visibleSlots = Math.min(4, maximum);
      return 44 + Math.max(0, visibleSlots - 1) * 18;
    }, [items]);

    // Manual order is authoritative; column sorting would mask persisted row moves.
    const columns = useMemo(
      () => [
        {
          id: 'assignees',
          sort: false,
          header: createHeader(t('common.ganttPerson'), 'users'),
          width: assigneesColumnWidth,
          resize: true,
          cell: AssigneesCell,
        },
        {
          id: 'text',
          sort: false,
          header: createHeader(t('common.ganttTask')),
          width: 190,
          resize: true,
          cell: TaskTitleCell,
        },
        {
          id: 'startLabel',
          sort: false,
          header: createHeader(t('common.ganttStart')),
          width: 64,
          align: 'center',
          resize: true,
        },
        {
          id: 'endLabel',
          sort: false,
          header: createHeader(t('common.ganttEnd')),
          width: 64,
          align: 'center',
          resize: true,
        },
        {
          id: 'durationLabel',
          sort: false,
          header: createHeader(t('common.ganttDuration')),
          width: 48,
          align: 'center',
        },
        {
          id: 'statusLabel',
          sort: false,
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

        ganttApi.on('open-task', ({ id }) => {
          expandedRef.current.set(String(id), ganttApi.getTask(id).open);
        });
        // Derived bars are presentation only. Stop the store before it moves a branch.
        const canChangeTask = ({ id }) => {
          const task = ganttApi.getTask(id);
          return Boolean(task && task.type !== 'summary' && !task.hasDerivedDates);
        };
        ganttApi.intercept('drag-task', (event) => event.top !== undefined || canChangeTask(event));
        ganttApi.intercept('update-task', (event) =>
          event.eventSource ? true : canChangeTask(event),
        );
        initRowDrag(ganttApi);

        if (!isDashboardWidget) {
          ganttApi.on('select-task', ({ id }) => {
            onItemSelectRef.current(String(id));
          });

          ganttApi.on('update-task', ({ id, inProgress, eventSource }) => {
            if (inProgress || eventSource) {
              return;
            }

            const task = ganttApi.getTask(id);
            if (!task?.start || !task?.end || task.type === 'summary' || task.hasDerivedDates) {
              return;
            }

            const item = itemsRef.current.find((candidate) => String(candidate.id) === String(id));
            if (item) {
              onItemChangeRef.current(String(id), mapTimelineTaskDateChanges(task, item));
            }
          });
        }

        window.requestAnimationFrame(() => {
          updateCurrentTimeMarker({ focus: isDashboardWidget });
          setReadyZoomLevel(zoomLevel);
        });
      },
      [isDashboardWidget, updateCurrentTimeMarker, zoomLevel, initRowDrag],
    );

    const timelineLinks = useMemo(() => mapGanttLinksToTimelineLinks(links), [links]);

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
        data-row-drag-enabled={!readonly && !isDashboardWidget && !rowDrag.isSaving}
        data-row-drag-intent={rowDrag.preview?.kind}
        onMouseDownCapture={rowDrag.onPointerDown}
        onTouchStartCapture={rowDrag.onPointerDown}
        onKeyDownCapture={rowDrag.onKeyDown}
        onPointerCancel={rowDrag.onCancel}
        style={{
          visibility: readyZoomLevel === zoomLevel ? 'visible' : 'hidden',
          '--gantt-row-shift': `${rowDrag.preview?.shift || 0}px`,
          '--gantt-row-indent': `${Math.max(0, (rowDrag.preview?.level || 1) - 1) * 20}px`,
        }}
      >
        <style>{taskColorStyles}</style>
        <WillowDark fonts={false}>
          <Gantt
            key={zoomLevel}
            tasks={tasks}
            taskTemplate={TaskBarContent}
            links={timelineLinks}
            columns={columns}
            gridWidth={523 + assigneesColumnWidth}
            readonly={readonly || rowDrag.isSaving}
            cellBorders="full"
            cellHeight={42}
            scaleHeight={54}
            lengthUnit="day"
            durationUnit="day"
            cellWidth={zoom.cellWidth}
            scales={zoom.scales}
            zoom={nativeZoom}
            highlightTime={highlightTime}
            start={tasks.length === 0 ? emptyRange.start : undefined}
            end={tasks.length === 0 ? emptyRange.end : undefined}
            autoScale
            init={handleInit}
          />
        </WillowDark>
        {rowDrag.preview && (
          <div className={styles.rowDragFeedback} role="status" aria-live="polite">
            <span aria-hidden="true">
              {{ order: '↕', child: '↳', outdent: '↰', invalid: '⊘' }[rowDrag.preview.kind]}
            </span>
            <span>
              {t(`common.ganttRowDrag_${rowDrag.preview.kind}`, {
                parent: rowDrag.preview.parentName || t('common.ganttRowDrag_root'),
              })}
            </span>
          </div>
        )}
        {dropPreview?.kind === 'list' && draggedItem && !readonly && (
          <>
            {dropPreview.valid && (
              <div
                className={styles.listDropTarget}
                data-child={dropPreview.mode === 'child'}
                style={{
                  left: dropPreview.left,
                  right: `calc(100% - ${dropPreview.width}px)`,
                  top: dropPreview.mode === 'child' ? dropPreview.parentTop : dropPreview.top,
                  height: dropPreview.mode === 'child' ? dropPreview.parentHeight : 2,
                }}
              />
            )}
            <div className={styles.rowDragFeedback} role="status">
              {dropPreview.valid
                ? t(`common.ganttListDrop_${dropPreview.target ? dropPreview.mode : 'root'}`, {
                    task: dropPreview.target,
                    start: dropPreview.changes.startDate,
                    end: dropPreview.changes.endDate,
                  })
                : t('common.ganttRowDrag_invalid')}
            </div>
          </>
        )}
        {dropPreview && dropPreview.kind !== 'list' && draggedItem && !readonly && (
          <div
            className={styles.dropOverlay}
            style={{
              left: dropPreview.chartLeft,
              top: dropPreview.chartTop,
              width: dropPreview.chartWidth,
              height: dropPreview.chartHeight,
            }}
          >
            <div
              className={styles.dropBar}
              style={{
                left: dropPreview.left,
                top: dropPreview.top,
                width: Math.max(1, dropPreview.width),
              }}
            />
            <div
              className={styles.dropLabel}
              role="status"
              style={{ top: Math.min(dropPreview.top + 32, dropPreview.chartHeight - 28) }}
            >
              {t('common.ganttDropPreview', {
                start: dropPreview.startDate,
                end: dropPreview.endDate,
                count: dropPreview.expectedDurationDays,
              })}
            </div>
          </div>
        )}
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
  moveItems: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  onItemMove: PropTypes.func,
  draggedItem: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onItemSchedule: PropTypes.func,
};

GanttTimelineAdapter.defaultProps = {
  variant: 'default',
  onZoomLevelChange: () => {},
  onItemSelect: () => {},
  onItemChange: () => {},
  moveItems: null,
  onItemMove: () => {},
  draggedItem: null,
  onItemSchedule: () => {},
};

export default GanttTimelineAdapter;
