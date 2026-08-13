/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Dropdown, Icon, Loader } from 'semantic-ui-react';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import Paths from '../../constants/Paths';
import { useGantt } from './GanttContext';
import GanttTimelineAdapter from './GanttTimelineAdapter';
import GanttItemPanel from './GanttItemPanel';
import GanttSourceTaskImportPanel from './GanttSourceTaskImportPanel';

import styles from './GanttWorkspace.module.scss';

const ZOOM_LEVELS = ['day', 'week', 'month', 'quarter'];

const GanttWorkspace = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);
  const isEditModeEnabled = useSelector(selectors.selectIsEditModeEnabled);
  const {
    plan,
    items,
    links,
    users,
    canEdit,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    reload,
  } = useGantt();
  const [zoomLevel, setZoomLevel] = useState('week');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [initialParentId, setInitialParentId] = useState(null);
  const panelTriggerRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [t] = useTranslation();

  const canMutate = canEdit && isEditModeEnabled;
  const selectedItem = items.find(({ id }) => id === selectedItemId) || null;

  useEffect(() => {
    if (plan?.defaultZoomLevel) {
      setZoomLevel(plan.defaultZoomLevel);
    }
  }, [plan?.defaultZoomLevel]);

  useEffect(() => {
    if (!isLoading && project && (!plan || !plan.isEnabled)) {
      navigate(Paths.PROJECTS.replace(':id', project.id), { replace: true });
    }
  }, [isLoading, navigate, plan, project]);

  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && items.some(({ id }) => id === itemId)) {
      setSelectedItemId(itemId);
      setIsPanelOpen(true);
      setIsImportPanelOpen(false);
    }
  }, [items, searchParams]);

  const generalItems = useMemo(
    () => items.filter(({ itemType }) => itemType === 'summary'),
    [items],
  );
  const itemsById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );
  const timelineItems = useMemo(
    () =>
      items.flatMap((item) => {
        if (item.itemType !== 'summary') {
          return item.startDate ? [item] : [];
        }

        const children = items.filter(({ parentId }) => parentId === item.id);
        const scheduledChildren = children.filter(({ startDate }) => startDate);
        if (scheduledChildren.length === 0) {
          return [];
        }

        return [
          {
            ...item,
            startDate: scheduledChildren.map(({ startDate }) => startDate).sort()[0],
            endDate: scheduledChildren
              .map(({ endDate }) => endDate)
              .sort()
              .at(-1),
            expectedDurationDays: scheduledChildren.reduce(
              (total, child) => total + child.expectedDurationDays,
              0,
            ),
          },
        ];
      }),
    [items],
  );
  const timelineItemIds = useMemo(
    () => new Set(timelineItems.map(({ id }) => id)),
    [timelineItems],
  );
  const timelineLinks = useMemo(
    () =>
      links.filter(
        ({ sourceItemId, targetItemId }) =>
          timelineItemIds.has(sourceItemId) && timelineItemIds.has(targetItemId),
      ),
    [links, timelineItemIds],
  );
  const unscheduledItems = useMemo(
    () => items.filter(({ itemType, startDate }) => itemType === 'task' && !startDate),
    [items],
  );
  const statuses = useMemo(
    () => [...new Set(items.map(({ status }) => status).filter(Boolean))].sort(),
    [items],
  );

  const handleNewItem = useCallback(() => {
    panelTriggerRef.current = document.activeElement;
    setSelectedItemId(null);
    setInitialParentId(null);
    setIsPanelOpen(true);
    setIsImportPanelOpen(false);
  }, []);

  const handleImportOpen = useCallback(() => {
    panelTriggerRef.current = document.activeElement;
    setIsPanelOpen(false);
    setIsImportPanelOpen(true);
  }, []);

  const handleItemSelect = useCallback((id) => {
    panelTriggerRef.current = document.activeElement;
    setSelectedItemId(id);
    setInitialParentId(null);
    setIsPanelOpen(true);
    setIsImportPanelOpen(false);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItemId(null);
    setInitialParentId(null);
    requestAnimationFrame(() => panelTriggerRef.current?.focus?.({ preventScroll: true }));
  }, []);

  const handleImportClose = useCallback(() => {
    setIsImportPanelOpen(false);
    requestAnimationFrame(() => panelTriggerRef.current?.focus?.({ preventScroll: true }));
  }, []);

  const handleImported = useCallback(
    (importedItems) => {
      setIsImportPanelOpen(false);
      if (importedItems.length === 1) {
        const itemId = importedItems[0].id;
        setSearchParams({ item: itemId }, { replace: true });
        setSelectedItemId(itemId);
        setIsPanelOpen(true);
      }
    },
    [setSearchParams],
  );

  const handleOpenImportedItem = useCallback(
    (itemId) => {
      setSearchParams({ item: itemId }, { replace: true });
      setIsImportPanelOpen(false);
      setSelectedItemId(itemId);
      setIsPanelOpen(true);
    },
    [setSearchParams],
  );

  const handleSave = useCallback(
    (data) => {
      if (!selectedItem) {
        return createItem(data);
      }
      const { itemType, ...updateData } = data;
      return updateItem(selectedItem.id, updateData);
    },
    [createItem, selectedItem, updateItem],
  );

  const handleAddSubtask = useCallback((parentId) => {
    setSelectedItemId(null);
    setInitialParentId(parentId);
  }, []);

  const handleItemChange = useCallback(
    async (id, changes) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || item.itemType === 'summary') {
        return;
      }

      try {
        await updateItem(id, { ...changes, version: item.version });
      } catch {
        toast.error(t('common.ganttSaveFailed'));
      }
    },
    [items, t, updateItem],
  );

  const handleZoomOut = useCallback(() => {
    setZoomLevel(
      (current) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.indexOf(current) + 1, ZOOM_LEVELS.length - 1)],
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((current) => ZOOM_LEVELS[Math.max(ZOOM_LEVELS.indexOf(current) - 1, 0)]);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.centerState}>
        <Loader active inverted size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState} role="alert">
        <Icon name="warning circle" size="big" />
        <h2>{t('common.ganttLoadFailed')}</h2>
        <Button variant="secondary" onClick={reload}>
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  if (!plan?.isEnabled) {
    return null;
  }

  return (
    <main className={styles.workspace}>
      <header className={styles.toolbar}>
        <div className={styles.titleGroup}>
          <span className={styles.titleIcon} aria-hidden="true">
            <Icon fitted name="calendar alternate outline" />
          </span>
          <div>
            <h1>{t('common.gantt')}</h1>
            <span>{t('common.ganttTaskCount', { count: items.length })}</span>
          </div>
        </div>

        {canMutate && (
          <>
            <Button
              size="sm"
              variant="primary"
              className={styles.newButton}
              onClick={handleNewItem}
            >
              <Icon name="plus" />
              {t('common.newGanttTask')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className={styles.newButton}
              onClick={handleImportOpen}
            >
              <Icon name="download" />
              {t('common.ganttImportFromBoards')}
            </Button>
          </>
        )}

        <div className={styles.toolbarSpacer} />

        {canEdit && !isEditModeEnabled && (
          <span className={styles.readonlyHint}>
            <Icon name="lock" />
            {t('common.ganttReadonlyHint')}
          </span>
        )}

        <div
          className={styles.zoomControls}
          role="group"
          aria-label={t('common.ganttTimelineScale')}
        >
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel === 'quarter'}
            aria-label={t('common.ganttZoomOut')}
          >
            −
          </button>
          <Dropdown
            compact
            selection
            value={zoomLevel}
            options={ZOOM_LEVELS.map((level) => ({
              key: level,
              text: t(`common.ganttZoom_${level}`),
              value: level,
            }))}
            aria-label={t('common.ganttZoomLevel')}
            data-testid="gantt-zoom-select"
            className={styles.zoomSelect}
            onChange={(event, { value }) => setZoomLevel(value)}
          />
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel === 'day'}
            aria-label={t('common.ganttZoomIn')}
          >
            +
          </button>
        </div>
      </header>

      <section className={styles.timelineArea}>
        {timelineItems.length > 0 ? (
          <GanttTimelineAdapter
            items={timelineItems}
            links={timelineLinks}
            zoomLevel={zoomLevel}
            readonly={!canMutate}
            onZoomLevelChange={setZoomLevel}
            onItemSelect={handleItemSelect}
            onItemChange={handleItemChange}
          />
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph} aria-hidden="true">
              <Icon fitted name="calendar plus outline" />
            </span>
            <h2>{t('common.ganttEmptyTitle')}</h2>
            <p>{t('common.ganttEmptyDescription')}</p>
            {canMutate && (
              <div className={styles.emptyActions}>
                <Button variant="primary" onClick={handleNewItem}>
                  {t('common.createFirstGanttTask')}
                </Button>
                <Button variant="secondary" onClick={handleImportOpen}>
                  {t('common.ganttImportFromBoards')}
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {unscheduledItems.length > 0 && (
        <section className={styles.unscheduled}>
          <div className={styles.unscheduledTitle}>
            <Icon name="inbox" />
            <strong>{t('common.ganttUnscheduled')}</strong>
            <span>{unscheduledItems.length}</span>
          </div>
          <div className={styles.unscheduledList}>
            {unscheduledItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.unscheduledItem}
                onClick={() => handleItemSelect(item.id)}
              >
                <strong>{item.task}</strong>
                <span>
                  {item.parentId && itemsById[item.parentId]
                    ? `${itemsById[item.parentId].task} · `
                    : ''}
                  {t('common.ganttDayCount', { count: item.expectedDurationDays })}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isPanelOpen && canMutate && (
        <GanttItemPanel
          item={selectedItem}
          users={users}
          generalItems={generalItems}
          dependencyItems={items.filter(
            ({ id, itemType }) => itemType === 'task' && id !== selectedItem?.id,
          )}
          predecessorIds={links
            .filter(({ targetItemId }) => targetItemId === selectedItem?.id)
            .map(({ sourceItemId }) => sourceItemId)}
          statuses={statuses}
          initialParentId={initialParentId || undefined}
          childCount={items.filter(({ parentId }) => parentId === selectedItem?.id).length}
          onSave={handleSave}
          onDelete={deleteItem}
          onAddSubtask={handleAddSubtask}
          onClose={handlePanelClose}
        />
      )}

      {isImportPanelOpen && canMutate && (
        <GanttSourceTaskImportPanel
          onImported={handleImported}
          onOpenItem={handleOpenImportedItem}
          onClose={handleImportClose}
        />
      )}
    </main>
  );
});

export default GanttWorkspace;
