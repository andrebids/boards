/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon, Loader } from 'semantic-ui-react';
import { RichSelect, WillowDark } from '@svar-ui/react-core';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import Paths from '../../constants/Paths';
import { useGantt } from './GanttContext';
import GanttTimelineAdapter from './GanttTimelineAdapter';
import GanttItemPanel from './GanttItemPanel';

import styles from './GanttWorkspace.module.scss';

const ZOOM_LEVELS = ['day', 'week', 'month', 'quarter'];

const GanttWorkspace = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);
  const isEditModeEnabled = useSelector(selectors.selectIsEditModeEnabled);
  const {
    plan,
    items,
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
  const [selectedItemId, setSelectedItemId] = useState(null);
  const panelTriggerRef = useRef(null);
  const navigate = useNavigate();
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

  const scheduledItems = useMemo(() => items.filter(({ startDate }) => startDate), [items]);
  const unscheduledItems = useMemo(() => items.filter(({ startDate }) => !startDate), [items]);
  const usersById = useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user])),
    [users],
  );
  const statuses = useMemo(
    () => [...new Set(items.map(({ status }) => status).filter(Boolean))].sort(),
    [items],
  );

  const handleNewItem = useCallback(() => {
    panelTriggerRef.current = document.activeElement;
    setSelectedItemId(null);
    setIsPanelOpen(true);
  }, []);

  const handleItemSelect = useCallback((id) => {
    panelTriggerRef.current = document.activeElement;
    setSelectedItemId(id);
    setIsPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedItemId(null);
    requestAnimationFrame(() => panelTriggerRef.current?.focus?.({ preventScroll: true }));
  }, []);

  const handleSave = useCallback(
    (data) => (selectedItem ? updateItem(selectedItem.id, data) : createItem(data)),
    [createItem, selectedItem, updateItem],
  );

  const handleDatesChange = useCallback(
    async (id, dates) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) {
        return;
      }

      try {
        await updateItem(id, { ...dates, version: item.version });
      } catch {
        toast.error(t('common.ganttSaveFailed'));
      }
    },
    [items, t, updateItem],
  );

  const handleZoomOut = useCallback(() => {
    setZoomLevel(
      (current) =>
        ZOOM_LEVELS[Math.min(ZOOM_LEVELS.indexOf(current) + 1, ZOOM_LEVELS.length - 1)],
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
          <Button variant="primary" className={styles.newButton} onClick={handleNewItem}>
            <Icon name="plus" />
            {t('common.newGanttTask')}
          </Button>
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
          <WillowDark fonts={false}>
            <RichSelect
              value={zoomLevel}
              options={ZOOM_LEVELS.map((level) => ({
                id: level,
                label: t(`common.ganttZoom_${level}`),
              }))}
              title={t('common.ganttZoomLevel')}
              css={styles.zoomSelect}
              dropdown={{ position: 'bottom', align: 'end', width: 'auto' }}
              onChange={({ value }) => setZoomLevel(value)}
            />
          </WillowDark>
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
        {scheduledItems.length > 0 ? (
          <GanttTimelineAdapter
            items={scheduledItems}
            usersById={usersById}
            zoomLevel={zoomLevel}
            readonly={!canMutate}
            onItemSelect={handleItemSelect}
            onItemDatesChange={handleDatesChange}
          />
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph} aria-hidden="true">
              <Icon fitted name="calendar plus outline" />
            </span>
            <h2>{t('common.ganttEmptyTitle')}</h2>
            <p>{t('common.ganttEmptyDescription')}</p>
            {canMutate && (
              <Button variant="primary" onClick={handleNewItem}>
                {t('common.createFirstGanttTask')}
              </Button>
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
                <span>{t('common.ganttDayCount', { count: item.expectedDurationDays })}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isPanelOpen && canMutate && (
        <GanttItemPanel
          item={selectedItem}
          users={users}
          statuses={statuses}
          onSave={handleSave}
          onDelete={deleteItem}
          onClose={handlePanelClose}
        />
      )}
    </main>
  );
});

export default GanttWorkspace;
