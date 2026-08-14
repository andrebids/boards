/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../lib/custom-ui';
import { usePopup } from '../../lib/popup';
import GANTT_COLORS from '../../constants/GanttColors';
import GANTT_STATUSES, { normalizeGanttStatus } from '../../constants/GanttStatuses';
import {
  addGanttBusinessDays,
  addGanttDays,
  countGanttBusinessDays,
  differenceInGanttDays,
} from '../../utils/gantt-dates';
import PureBoardMembershipsStep from '../board-memberships/PureBoardMembershipsStep';
import UserAvatar from '../users/UserAvatar';
import Paths from '../../constants/Paths';

import styles from './GanttItemPanel.module.scss';

const COLORS = Object.keys(GANTT_COLORS);
const DURATION_UNIT_DAYS = { day: 1, week: 7, month: 30 };
const DURATION_UNITS = Object.keys(DURATION_UNIT_DAYS);
const MAX_VISIBLE_ASSIGNEES = 5;

const getDurationValue = ({ durationUnit, endDate, expectedDurationDays, startDate }) =>
  durationUnit === 'day' && startDate && endDate
    ? countGanttBusinessDays(startDate, endDate)
    : Math.max(1, Math.ceil(expectedDurationDays / DURATION_UNIT_DAYS[durationUnit]));

const calculateDuration = (startDate, durationValue, durationUnit) => {
  const endDate =
    durationUnit === 'day'
      ? addGanttBusinessDays(startDate, durationValue - 1)
      : addGanttDays(startDate, durationValue * DURATION_UNIT_DAYS[durationUnit] - 1);

  return {
    endDate,
    expectedDurationDays: differenceInGanttDays(startDate, endDate) + 1,
  };
};

const getItemStatus = (item, defaultStatus) => {
  if (!item?.sourceTask) {
    return normalizeGanttStatus(item?.status) || defaultStatus;
  }
  return item.sourceTask.isCompleted ? 'completed' : 'notStarted';
};

const createInitialData = (item, initialParentId, defaultStatus) => ({
  task: item?.task || '',
  itemType: item?.itemType || 'task',
  parentId: item?.parentId || initialParentId || '',
  assigneeUserIds: item?.assigneeUserIds || [],
  status: getItemStatus(item, defaultStatus),
  color: item?.color || 'blue',
  expectedDurationDays: item?.expectedDurationDays || 1,
  durationUnit: 'day',
  startDate: item?.startDate || '',
  endDate: item?.endDate || '',
});

const GanttItemPanel = React.memo(
  ({
    item,
    users,
    generalItems,
    dependencyItems,
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
    const isLinked = Boolean(item?.sourceTaskId && item?.sourceTask);
    const defaultStatus = 'notStarted';
    const [data, setData] = useState(() => ({
      ...createInitialData(item, initialParentId, defaultStatus),
      predecessorIds,
    }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const taskInputRef = useRef(null);
    const PeoplePopup = usePopup(PureBoardMembershipsStep, { position: 'bottom right' });

    useEffect(() => {
      const initialData = createInitialData(item, initialParentId, defaultStatus);
      if (item?.sourceTask) {
        initialData.status = item.sourceTask.isCompleted ? 'completed' : 'notStarted';
      }
      setData({ ...initialData, predecessorIds });
      setError(null);
    }, [defaultStatus, initialParentId, item, predecessorIds, t]);

    useEffect(() => {
      taskInputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && !isSubmitting) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitting, onClose]);

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
    const dependencyOptions = useMemo(
      () => dependencyItems.map(({ id, task }) => ({ key: id, value: id, text: task })),
      [dependencyItems],
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

    const handleDependenciesChange = useCallback((_, { value }) => {
      setData((current) => ({ ...current, predecessorIds: value }));
    }, []);

    const handleStartChange = useCallback((event) => {
      const { value } = event.currentTarget;
      setData((current) => {
        const duration = value
          ? calculateDuration(value, getDurationValue(current), current.durationUnit)
          : { endDate: '' };

        return { ...current, startDate: value, ...duration };
      });
    }, []);

    const handleDurationChange = useCallback((event) => {
      const durationValue = Math.max(1, Number(event.currentTarget.value) || 1);
      setData((current) => {
        const duration = current.startDate
          ? calculateDuration(current.startDate, durationValue, current.durationUnit)
          : {
              expectedDurationDays: durationValue * DURATION_UNIT_DAYS[current.durationUnit],
              endDate: '',
            };

        return { ...current, ...duration };
      });
    }, []);

    const handleDurationUnitChange = useCallback((_, { value: durationUnit }) => {
      setData((current) => {
        const durationValue =
          durationUnit === 'day' && current.startDate && current.endDate
            ? countGanttBusinessDays(current.startDate, current.endDate)
            : Math.max(
                1,
                Math.ceil(current.expectedDurationDays / DURATION_UNIT_DAYS[durationUnit]),
              );
        const duration = current.startDate
          ? calculateDuration(current.startDate, durationValue, durationUnit)
          : {
              expectedDurationDays: durationValue * DURATION_UNIT_DAYS[durationUnit],
              endDate: '',
            };

        return {
          ...current,
          durationUnit,
          ...duration,
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
          ? { ...current, endDate: value, expectedDurationDays, durationUnit: 'day' }
          : { ...current, endDate: value };
      });
    }, []);

    const handleSubmit = useCallback(
      async (event) => {
        event.preventDefault();
        if (!data.task.trim()) {
          setError(t('common.ganttTaskNameRequired'));
          return;
        }
        if (data.startDate && (!data.endDate || data.endDate < data.startDate)) {
          setError(t('common.ganttInvalidDateRange'));
          return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
          const payload = {
            task: data.task.trim(),
            itemType: data.itemType,
            parentId: data.itemType === 'task' ? data.parentId || null : null,
            assigneeUserIds: data.assigneeUserIds,
            status: data.status.trim() || null,
            color: data.color,
            predecessorIds: data.itemType === 'task' ? data.predecessorIds : [],
            expectedDurationDays: Number(data.expectedDurationDays),
            startDate: data.itemType === 'task' ? data.startDate || null : null,
            endDate: data.itemType === 'task' ? data.endDate || null : null,
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
      [data, isLinked, item, onClose, onSave, t],
    );

    const handleDelete = useCallback(async () => {
      let confirmation = t('common.ganttDeleteTaskConfirmation');
      if (item.itemType === 'summary' && childCount > 0) {
        confirmation = t('common.ganttDeleteGeneralTaskConfirmation', { count: childCount });
      } else if (isLinked) {
        confirmation = t('common.ganttRemoveLinkedTaskConfirmation');
      }

      // eslint-disable-next-line no-alert
      if (!window.confirm(confirmation)) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onDelete(item.id);
        onClose();
      } catch {
        setError(t('common.ganttTaskDeleteFailed'));
        setIsSubmitting(false);
      }
    }, [childCount, isLinked, item, onClose, onDelete, t]);

    const isSummary = data.itemType === 'summary';

    return (
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
                  {item.sourceTask.boardName} / {item.sourceTask.cardName}
                </strong>
                <small>
                  {item.sourceTask.taskListName} · {t('common.ganttEditSourceFieldsInCard')}
                </small>
              </div>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => navigate(Paths.CARDS.replace(':id', item.sourceTask.cardId))}
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

          {!item && (
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
          )}

          <div className={styles.field}>
            <span id="gantt-task-people-label">{t('common.ganttPerson')}</span>
            <div className={styles.people} role="group" aria-labelledby="gantt-task-people-label">
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
                      <UserAvatar id={user.id} size="medium" variant="board" withTitle={false} />
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

          <div className={styles.twoColumns}>
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
                  text: t(`common.ganttStatus_${status}`),
                  value: status,
                }))}
                aria-labelledby="gantt-task-status-label"
                onChange={handleDropdownChange}
              />
            </div>
            <div className={styles.field}>
              <span id="gantt-task-color-label">{t('common.ganttColor')}</span>
              <Dropdown
                fluid
                selection
                id="gantt-task-color"
                name="color"
                value={data.color}
                options={COLORS.map((color) => ({
                  key: color,
                  text: (
                    <span className={styles.colorOption}>
                      <span
                        className={styles.colorDot}
                        style={{ backgroundColor: GANTT_COLORS[color] }}
                        aria-hidden="true"
                      />
                      {t(`common.ganttColor_${color}`)}
                    </span>
                  ),
                  value: color,
                }))}
                aria-labelledby="gantt-task-color-label"
                onChange={handleDropdownChange}
              />
            </div>
          </div>

          {!isSummary && (
            <div className={styles.field}>
              <label htmlFor="gantt-task-duration">{t('common.ganttExpectedDuration')}</label>
              <div className={styles.durationInput}>
                <input
                  id="gantt-task-duration"
                  type="number"
                  min="1"
                  step="1"
                  value={getDurationValue(data)}
                  aria-describedby="gantt-task-duration-help"
                  onChange={handleDurationChange}
                />
                <div
                  id="gantt-task-duration-unit"
                  className={styles.durationUnits}
                  role="group"
                  aria-label={t('common.ganttDurationUnit')}
                >
                  {DURATION_UNITS.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className={`${styles.durationUnit} ${
                        data.durationUnit === unit ? styles.durationUnitActive : ''
                      }`}
                      aria-pressed={data.durationUnit === unit}
                      onClick={(event) => handleDurationUnitChange(event, { value: unit })}
                    >
                      {t(`common.ganttDurationUnit_${unit}`)}
                    </button>
                  ))}
                </div>
              </div>
              <small id="gantt-task-duration-help">{t('common.ganttDurationHelp')}</small>
            </div>
          )}

          {!isSummary && (
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
          )}

          {!isSummary && !data.startDate && (
            <p className={styles.unscheduledHint}>{t('common.ganttUnscheduledHint')}</p>
          )}

          {!isSummary && item && (
            <div className={styles.field}>
              <span id="gantt-task-dependencies-label">{t('common.ganttDependsOn')}</span>
              <Dropdown
                fluid
                multiple
                search
                selection
                placeholder={t('common.ganttSelectDependencies')}
                value={data.predecessorIds}
                options={dependencyOptions}
                noResultsMessage={t('common.ganttNoDependenciesFound')}
                aria-labelledby="gantt-task-dependencies-label"
                onChange={handleDependenciesChange}
              />
              <small>{t('common.ganttDependenciesHint')}</small>
            </div>
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
                onClick={handleDelete}
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
    );
  },
);

GanttItemPanel.propTypes = {
  item: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  users: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  generalItems: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  dependencyItems: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
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
