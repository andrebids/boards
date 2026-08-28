/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AlertDialog, Button } from '../../lib/custom-ui';
import { usePopup } from '../../lib/popup';
import { GANTT_STATUS_COLORS } from '../../constants/GanttColors';
import GANTT_STATUSES, { getEffectiveGanttStatus } from '../../constants/GanttStatuses';
import { countGanttBusinessDays, differenceInGanttDays } from '../../utils/gantt-dates';
import PureBoardMembershipsStep from '../board-memberships/PureBoardMembershipsStep';
import UserAvatar from '../users/UserAvatar';
import Paths from '../../constants/Paths';

import styles from './GanttItemPanel.module.scss';

const DURATION_UNIT_DAYS = { day: 1, week: 7 };
const MAX_VISIBLE_ASSIGNEES = 5;

const createInitialData = (item, initialParentId, defaultStatus) => ({
  task: item?.task || '',
  itemType: item?.itemType || 'task',
  parentId: item?.parentId || initialParentId || '',
  assigneeUserIds: item?.assigneeUserIds || [],
  status: getEffectiveGanttStatus(item, defaultStatus),
  expectedDurationDays: item?.expectedDurationDays || 1,
  durationUnit: item?.durationUnit || 'day',
  startDate: item?.startDate || '',
  endDate: item?.endDate || '',
});

const GanttItemPanel = React.memo(
  ({
    item,
    users,
    generalItems,
    predecessorIds,
    initialParentId,
    childCount,
    onSave,
    onDelete,
    onAddSubtask,
    onClose,
  }) => {
    const [t] = useTranslation();
    const navigate = useNavigate();
    const source = item?.sourceTask || item?.sourceCard;
    const isLinked = Boolean(source);
    const defaultStatus = 'notStarted';
    const [data, setData] = useState(() => ({
      ...createInitialData(item, initialParentId, defaultStatus),
      predecessorIds,
    }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [error, setError] = useState(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(Boolean(item));
    const [timeMode, setTimeMode] = useState(
      item?.startDate && item?.endDate ? 'schedule' : 'estimate',
    );
    const taskInputRef = useRef(null);
    const PeoplePopup = usePopup(PureBoardMembershipsStep, { position: 'bottom right' });

    useEffect(() => {
      const initialData = createInitialData(item, initialParentId, defaultStatus);
      setData({ ...initialData, predecessorIds });
      setShowAdvancedOptions(Boolean(item));
      setTimeMode(item?.startDate && item?.endDate ? 'schedule' : 'estimate');
      setDeleteConfirmation(null);
      setError(null);
    }, [defaultStatus, initialParentId, item, predecessorIds]);

    useEffect(() => {
      taskInputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && !deleteConfirmation && !isSubmitting) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [deleteConfirmation, isSubmitting, onClose]);

    const peopleItems = useMemo(
      () => users.map((user) => ({ id: user.id, user, isPersisted: true })),
      [users],
    );
    const selectedUsers = users.filter(({ id }) => data.assigneeUserIds.includes(id));
    const hiddenAssignees = Math.max(0, selectedUsers.length - MAX_VISIBLE_ASSIGNEES);
    const generalOptions = useMemo(
      () => generalItems.map(({ id, task }) => ({ key: id, value: id, text: task })),
      [generalItems],
    );
    const handleFieldChange = useCallback((event) => {
      const { name, value } = event.currentTarget;
      setData((current) => ({ ...current, [name]: value }));
    }, []);

    const handleDropdownChange = useCallback((_, { name, value }) => {
      setData((current) => ({ ...current, [name]: value }));
    }, []);

    const handlePeopleSelect = useCallback((userId) => {
      setData((current) => ({
        ...current,
        assigneeUserIds: current.assigneeUserIds.includes(userId)
          ? current.assigneeUserIds
          : [...current.assigneeUserIds, userId],
      }));
    }, []);

    const handlePeopleDeselect = useCallback((userId) => {
      setData((current) => ({
        ...current,
        assigneeUserIds: current.assigneeUserIds.filter((id) => id !== userId),
      }));
    }, []);

    const handlePeopleClear = useCallback(() => {
      setData((current) => ({ ...current, assigneeUserIds: [] }));
    }, []);

    const handleParentChange = useCallback((_, { value }) => {
      setData((current) => ({ ...current, parentId: value || '' }));
    }, []);

    const handleStartChange = useCallback((event) => {
      const { value } = event.currentTarget;
      setData((current) => {
        if (!value) {
          return { ...current, startDate: '', endDate: '', expectedDurationDays: 1 };
        }

        if (!current.endDate || current.endDate < value) {
          return { ...current, startDate: value, endDate: '', expectedDurationDays: 1 };
        }

        return {
          ...current,
          startDate: value,
          expectedDurationDays: differenceInGanttDays(value, current.endDate) + 1,
        };
      });
    }, []);

    const handleEndChange = useCallback((event) => {
      const { value } = event.currentTarget;
      setData((current) => {
        if (!current.startDate || !value) {
          return { ...current, endDate: value };
        }

        const expectedDurationDays = differenceInGanttDays(current.startDate, value) + 1;
        return expectedDurationDays > 0
          ? { ...current, endDate: value, expectedDurationDays }
          : { ...current, endDate: value };
      });
    }, []);

    const handleDurationChange = useCallback((event) => {
      const durationValue = Math.max(1, Number(event.currentTarget.value) || 1);
      setData((current) => ({
        ...current,
        expectedDurationDays: durationValue * DURATION_UNIT_DAYS[current.durationUnit],
      }));
    }, []);

    const handleDurationUnitChange = useCallback((_, { value: durationUnit }) => {
      setData((current) => ({
        ...current,
        durationUnit,
        expectedDurationDays:
          Math.max(1, Math.ceil(current.expectedDurationDays / DURATION_UNIT_DAYS[durationUnit])) *
          DURATION_UNIT_DAYS[durationUnit],
      }));
    }, []);

    const handleTimeModeChange = useCallback((nextMode) => {
      setTimeMode(nextMode);
      setData((current) => ({
        ...current,
        startDate: '',
        endDate: '',
      }));
    }, []);

    const handleSubmit = useCallback(
      async (event) => {
        event.preventDefault();
        if (!data.task.trim()) {
          setError(t('common.ganttTaskNameRequired'));
          return;
        }
        if (
          timeMode === 'schedule' &&
          data.startDate &&
          (!data.endDate || data.endDate < data.startDate)
        ) {
          setError(t('common.ganttInvalidDateRange'));
          return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
          const payload = {
            task: data.task.trim(),
            itemType: data.itemType,
            parentId: data.itemType !== 'summary' ? data.parentId || null : null,
            assigneeUserIds: data.assigneeUserIds,
            status: data.status.trim() || null,
            predecessorIds: data.itemType !== 'summary' ? data.predecessorIds : [],
            expectedDurationDays: Number(data.expectedDurationDays),
            startDate:
              data.itemType !== 'summary' && timeMode === 'schedule' ? data.startDate || null : null,
            endDate:
              data.itemType !== 'summary' && timeMode === 'schedule' ? data.endDate || null : null,
            ...(item && { version: item.version }),
          };
          if (isLinked) {
            delete payload.task;
            delete payload.assigneeUserIds;
            delete payload.status;
          }
          await onSave(payload);
          onClose();
        } catch (nextError) {
          setError(
            nextError.statusCode === 409
              ? t('common.ganttTaskConflict')
              : t('common.ganttTaskSaveFailed'),
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      [data, isLinked, item, onClose, onSave, t, timeMode],
    );

    const handleDeleteClick = useCallback(() => {
      let confirmation = t('common.ganttDeleteTaskConfirmation');
      if (item.itemType === 'summary' && childCount > 0) {
        confirmation = t('common.ganttDeleteGeneralTaskConfirmation', { count: childCount });
      } else if (isLinked) {
        confirmation = t('common.ganttRemoveLinkedTaskConfirmation');
      }

      setDeleteConfirmation(confirmation);
    }, [childCount, isLinked, item, t]);

    const handleDeleteConfirm = useCallback(async () => {
      setIsSubmitting(true);
      try {
        await onDelete(item.id);
        onClose();
      } catch {
        setError(t('common.ganttTaskDeleteFailed'));
        setDeleteConfirmation(null);
        setIsSubmitting(false);
      }
    }, [item, onClose, onDelete, t]);

    const isSummary = data.itemType === 'summary';
    const calculatedDuration =
      data.startDate && data.endDate ? countGanttBusinessDays(data.startDate, data.endDate) : null;
    const durationValue = Math.max(
      1,
      Math.ceil(data.expectedDurationDays / DURATION_UNIT_DAYS[data.durationUnit]),
    );

    return (
      <>
        <aside className={styles.panel} role="dialog" aria-labelledby="gantt-item-panel-title">
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{t('common.ganttPlanningEyebrow')}</span>
            <h2 id="gantt-item-panel-title">
              {item ? t('common.ganttEditTask') : t('common.newGanttTask')}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <Icon fitted name="close" aria-hidden="true" />
          </button>
        </header>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-describedby={error ? 'gantt-item-error' : undefined}
        >
          {isLinked && (
            <div className={styles.sourceBanner}>
              <div>
                <span>
                  <Icon name="columns" />
                  {t('common.ganttFromBoard')}
                </span>
                <strong>
                  {source.boardName} / {source.cardName || source.name}
                </strong>
                <small>
                  {source.taskListName || source.listName || t('common.ganttCardSource')} ·{' '}
                  {t('common.ganttEditSourceFieldsInCard')}
                </small>
              </div>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => navigate(Paths.CARDS.replace(':id', source.cardId || source.id))}
              >
                {t('common.ganttOpenCard')}
              </Button>
            </div>
          )}
          <label className={styles.field} htmlFor="gantt-task-name">
            <span>{isSummary ? t('common.project') : t('common.ganttTask')}</span>
            <input
              ref={taskInputRef}
              id="gantt-task-name"
              name="task"
              value={data.task}
              maxLength={1024}
              required
              disabled={isLinked}
              aria-invalid={Boolean(error && !data.task.trim())}
              onChange={handleFieldChange}
            />
          </label>

          {(item || showAdvancedOptions) && (
            <div className={styles.field}>
              <span id="gantt-task-type-label">{t('common.ganttTaskType')}</span>
              <Dropdown
                fluid
                selection
                id="gantt-task-type"
                name="itemType"
                value={data.itemType}
                options={[
                  {
                    key: 'task',
                    text: t('common.ganttTaskType_task'),
                    value: 'task',
                  },
                  {
                    key: 'summary',
                    text: t('common.ganttTaskType_summary'),
                    value: 'summary',
                  },
                ]}
                aria-labelledby="gantt-task-type-label"
                onChange={handleDropdownChange}
              />
            </div>
          )}

          {!isSummary && (
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <span id="gantt-task-people-label">{t('common.ganttPerson')}</span>
                <div
                  className={styles.people}
                  role="group"
                  aria-labelledby="gantt-task-people-label"
                >
                  {selectedUsers.slice(0, MAX_VISIBLE_ASSIGNEES).map((user) =>
                    isLinked ? (
                      <UserAvatar key={user.id} id={user.id} size="medium" variant="board" />
                    ) : (
                      <PeoplePopup
                        key={user.id}
                        items={peopleItems}
                        currentUserIds={data.assigneeUserIds}
                        onUserSelect={handlePeopleSelect}
                        onUserDeselect={handlePeopleDeselect}
                        onClear={handlePeopleClear}
                      >
                        <button
                          type="button"
                          className={styles.personButton}
                          aria-label={user.name || user.username || user.email}
                          title={user.name || user.username || user.email}
                        >
                          <UserAvatar
                            id={user.id}
                            size="medium"
                            variant="board"
                            withTitle={false}
                          />
                        </button>
                      </PeoplePopup>
                    ),
                  )}
                  {!isLinked && hiddenAssignees > 0 && (
                    <PeoplePopup
                      items={peopleItems}
                      currentUserIds={data.assigneeUserIds}
                      onUserSelect={handlePeopleSelect}
                      onUserDeselect={handlePeopleDeselect}
                      onClear={handlePeopleClear}
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="secondary"
                        type="button"
                        className={styles.peopleButton}
                        aria-label={`+${hiddenAssignees} ${t('common.members')}`}
                        title={`+${hiddenAssignees} ${t('common.members')}`}
                      >
                        +{hiddenAssignees}
                      </Button>
                    </PeoplePopup>
                  )}
                  {!isLinked && (
                    <PeoplePopup
                      items={peopleItems}
                      currentUserIds={data.assigneeUserIds}
                      onUserSelect={handlePeopleSelect}
                      onUserDeselect={handlePeopleDeselect}
                      onClear={handlePeopleClear}
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="secondary"
                        type="button"
                        className={styles.peopleButton}
                        aria-label={t('action.addMember')}
                        title={t('action.addMember')}
                      >
                        <Icon fitted name="add user" aria-hidden="true" />
                      </Button>
                    </PeoplePopup>
                  )}
                  {isLinked && selectedUsers.length === 0 && (
                    <span className={styles.sourceEmpty}>{t('common.ganttNoAssignee')}</span>
                  )}
                </div>
              </div>
              <div className={styles.field}>
                <span id="gantt-task-parent-label">{t('common.ganttGeneralTask')}</span>
                <Dropdown
                  fluid
                  search
                  selection
                  clearable
                  placeholder={t('common.ganttIndependentTask')}
                  value={data.parentId}
                  options={generalOptions}
                  noResultsMessage={t('common.ganttNoGeneralTasksFound')}
                  aria-labelledby="gantt-task-parent-label"
                  onChange={handleParentChange}
                />
              </div>
            </div>
          )}

          {(item || showAdvancedOptions) && (
            <div className={styles.field}>
              <span id="gantt-task-status-label">{t('common.ganttStatus')}</span>
              <Dropdown
                fluid
                selection
                id="gantt-task-status"
                name="status"
                value={data.status}
                disabled={isLinked}
                options={GANTT_STATUSES.map((status) => ({
                  key: status,
                  text: (
                    <span className={styles.statusOption}>
                      <span
                        className={styles.statusDot}
                        style={{ '--gantt-status-color': GANTT_STATUS_COLORS[status] }}
                        aria-hidden="true"
                      />
                      {t(`common.ganttStatus_${status}`)}
                    </span>
                  ),
                  value: status,
                }))}
                aria-labelledby="gantt-task-status-label"
                onChange={handleDropdownChange}
              />
            </div>
          )}

          {!isSummary && (
            <section className={styles.timeSection} aria-labelledby="gantt-time-title">
              <div className={styles.timeHeader}>
                <span id="gantt-time-title">{t('common.ganttTimeScheduling')}</span>
                <span className={styles.info} title={t('common.ganttDurationHelp')}>
                  <Icon name="info circle" aria-hidden="true" />
                </span>
              </div>
              <div
                className={styles.timeTabs}
                role="tablist"
                aria-label={t('common.ganttTimeScheduling')}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={timeMode === 'estimate'}
                  className={timeMode === 'estimate' ? styles.timeTabActive : styles.timeTab}
                  onClick={() => handleTimeModeChange('estimate')}
                >
                  {t('common.ganttEstimateDuration')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={timeMode === 'schedule'}
                  className={timeMode === 'schedule' ? styles.timeTabActive : styles.timeTab}
                  onClick={() => handleTimeModeChange('schedule')}
                >
                  {t('common.ganttScheduleDates')}
                </button>
              </div>

              {timeMode === 'estimate' ? (
                <div className={styles.durationRow}>
                  <label className={styles.field} htmlFor="gantt-task-duration">
                    <span>{t('common.ganttDuration')}</span>
                    <input
                      id="gantt-task-duration"
                      type="number"
                      min="1"
                      step="1"
                      value={durationValue}
                      onChange={handleDurationChange}
                    />
                  </label>
                  <div className={styles.field}>
                    <span id="gantt-task-duration-unit-label">{t('common.ganttDurationUnit')}</span>
                    <Dropdown
                      fluid
                      selection
                      name="durationUnit"
                      value={data.durationUnit}
                      options={[
                        { key: 'day', value: 'day', text: t('common.ganttDurationUnit_day') },
                        { key: 'week', value: 'week', text: t('common.ganttDurationUnit_week') },
                      ]}
                      aria-labelledby="gantt-task-duration-unit-label"
                      onChange={handleDurationUnitChange}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.twoColumns}>
                    <label className={styles.field} htmlFor="gantt-task-start">
                      <span>{t('common.ganttStart')}</span>
                      <input
                        id="gantt-task-start"
                        type="date"
                        value={data.startDate}
                        onChange={handleStartChange}
                      />
                    </label>
                    <label className={styles.field} htmlFor="gantt-task-end">
                      <span>{t('common.ganttEnd')}</span>
                      <input
                        id="gantt-task-end"
                        type="date"
                        value={data.endDate}
                        min={data.startDate || undefined}
                        disabled={!data.startDate}
                        onChange={handleEndChange}
                      />
                    </label>
                  </div>
                  <div className={styles.dateMeta}>
                    {calculatedDuration ? (
                      <span>
                        {t('common.ganttCalculatedDuration', { count: calculatedDuration })}
                      </span>
                    ) : (
                      <span className={styles.dateHint}>{t('common.ganttUnscheduledHint')}</span>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {!item && (
            <button
              type="button"
              className={styles.advancedToggle}
              aria-expanded={showAdvancedOptions}
              onClick={() => setShowAdvancedOptions((visible) => !visible)}
            >
              {showAdvancedOptions
                ? t('common.ganttHideAdvancedOptions')
                : t('common.ganttShowAdvancedOptions')}
            </button>
          )}

          {error && (
            <p id="gantt-item-error" className={styles.error} role="alert">
              {error}
            </p>
          )}

          <footer className={styles.footer}>
            {item?.itemType === 'summary' && (
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                type="button"
                title={t('common.ganttAddSubtask')}
                aria-label={t('common.ganttAddSubtask')}
                onClick={() => onAddSubtask(item.id)}
              >
                <Icon fitted name="plus" aria-hidden="true" />
              </Button>
            )}
            {item && (
              <Button
                isIconOnly
                size="sm"
                variant="danger-soft"
                type="button"
                title={t('common.delete')}
                aria-label={t('common.delete')}
                disabled={isSubmitting}
                onClick={handleDeleteClick}
              >
                <Icon fitted name="trash alternate outline" aria-hidden="true" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              type="button"
              className={styles.cancelButton}
              disabled={isSubmitting}
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" type="submit" loading={isSubmitting}>
              {item ? t('common.ganttSaveChanges') : t('common.ganttCreateTask')}
            </Button>
          </footer>
        </form>
        </aside>
        {deleteConfirmation && (
          <AlertDialog
            cancelLabel={t('action.cancel')}
            confirmLabel={t('action.delete')}
            description={deleteConfirmation}
            isPending={isSubmitting}
            open
            title={t('common.deleteTask', { context: 'title' })}
            tone="danger"
            onCancel={() => setDeleteConfirmation(null)}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </>
    );
  },
);

GanttItemPanel.propTypes = {
  item: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  users: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  generalItems: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  predecessorIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  initialParentId: PropTypes.string,
  childCount: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAddSubtask: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

GanttItemPanel.defaultProps = {
  item: null,
  initialParentId: undefined,
};

export default GanttItemPanel;
