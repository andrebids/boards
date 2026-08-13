/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Icon } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';
import { addGanttDays, differenceInGanttDays } from '../../utils/gantt-dates';

import styles from './GanttItemPanel.module.scss';

const COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'teal', 'gray'];

const createInitialData = (item, initialParentId) => ({
  task: item?.task || '',
  itemType: item?.itemType || 'task',
  parentId: item?.parentId || initialParentId || '',
  description: item?.description || '',
  assigneeUserIds: item?.assigneeUserIds || [],
  status: item?.status || '',
  progress: item?.progress || 0,
  color: item?.color || 'blue',
  expectedDurationDays: item?.expectedDurationDays || 1,
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
    statuses,
    initialParentId,
    childCount,
    onSave,
    onDelete,
    onAddSubtask,
    onClose,
  }) => {
    const [t] = useTranslation();
    const [data, setData] = useState(() => ({
      ...createInitialData(item, initialParentId),
      predecessorIds,
    }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const taskInputRef = useRef(null);

    useEffect(() => {
      setData({ ...createInitialData(item, initialParentId), predecessorIds });
      setError(null);
    }, [initialParentId, item, predecessorIds]);

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

    const userOptions = useMemo(
      () =>
        users.map((user) => ({
          key: user.id,
          value: user.id,
          text: user.name || user.username || user.email,
        })),
      [users],
    );
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

    const handlePeopleChange = useCallback((_, { value }) => {
      setData((current) => ({ ...current, assigneeUserIds: value }));
    }, []);

    const handleParentChange = useCallback((_, { value }) => {
      setData((current) => ({ ...current, parentId: value || '' }));
    }, []);

    const handleDependenciesChange = useCallback((_, { value }) => {
      setData((current) => ({ ...current, predecessorIds: value }));
    }, []);

    const handleStartChange = useCallback((event) => {
      const { value } = event.currentTarget;
      setData((current) => ({
        ...current,
        startDate: value,
        endDate: value ? addGanttDays(value, Number(current.expectedDurationDays) - 1) : '',
      }));
    }, []);

    const handleDurationChange = useCallback((event) => {
      const expectedDurationDays = Math.max(1, Number(event.currentTarget.value) || 1);
      setData((current) => ({
        ...current,
        expectedDurationDays,
        endDate: current.startDate ? addGanttDays(current.startDate, expectedDurationDays - 1) : '',
      }));
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
          await onSave({
            task: data.task.trim(),
            itemType: data.itemType,
            parentId: data.itemType === 'task' ? data.parentId || null : null,
            description: data.description.trim() || null,
            assigneeUserIds: data.assigneeUserIds,
            status: data.status.trim() || null,
            progress: data.itemType === 'task' ? Number(data.progress) : 0,
            color: data.color,
            predecessorIds: data.itemType === 'task' ? data.predecessorIds : [],
            expectedDurationDays: Number(data.expectedDurationDays),
            startDate: data.itemType === 'task' ? data.startDate || null : null,
            endDate: data.itemType === 'task' ? data.endDate || null : null,
            ...(item && { version: item.version }),
          });
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
      [data, item, onClose, onSave, t],
    );

    const handleDelete = useCallback(async () => {
      if (
        // eslint-disable-next-line no-alert
        !window.confirm(
          item.itemType === 'summary' && childCount > 0
            ? t('common.ganttDeleteGeneralTaskConfirmation', { count: childCount })
            : t('common.ganttDeleteTaskConfirmation'),
        )
      ) {
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
    }, [childCount, item, onClose, onDelete, t]);

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
          <label className={styles.field} htmlFor="gantt-task-name">
            <span>{t('common.ganttTask')}</span>
            <input
              ref={taskInputRef}
              id="gantt-task-name"
              name="task"
              value={data.task}
              maxLength={1024}
              required
              aria-invalid={Boolean(error && !data.task.trim())}
              onChange={handleFieldChange}
            />
          </label>

          {!item && (
            <label className={styles.field} htmlFor="gantt-task-type">
              <span>{t('common.ganttTaskType')}</span>
              <select
                id="gantt-task-type"
                name="itemType"
                value={data.itemType}
                onChange={handleFieldChange}
              >
                <option value="task">{t('common.ganttTaskType_task')}</option>
                <option value="summary">{t('common.ganttTaskType_summary')}</option>
              </select>
            </label>
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

          <label className={styles.field} htmlFor="gantt-task-description">
            <span>{t('common.ganttDescription')}</span>
            <textarea
              id="gantt-task-description"
              name="description"
              value={data.description}
              maxLength={4096}
              rows={3}
              onChange={handleFieldChange}
            />
          </label>

          <div className={styles.field}>
            <span id="gantt-task-people-label">{t('common.ganttPerson')}</span>
            <Dropdown
              fluid
              multiple
              search
              selection
              placeholder={t('common.ganttSelectProjectMembers')}
              value={data.assigneeUserIds}
              options={userOptions}
              noResultsMessage={t('common.ganttNoMembersFound')}
              aria-labelledby="gantt-task-people-label"
              onChange={handlePeopleChange}
            />
          </div>

          <div className={styles.twoColumns}>
            <label className={styles.field} htmlFor="gantt-task-status">
              <span>{t('common.ganttStatus')}</span>
              <input
                id="gantt-task-status"
                name="status"
                value={data.status}
                maxLength={128}
                list="gantt-statuses"
                onChange={handleFieldChange}
              />
              <datalist id="gantt-statuses">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </datalist>
            </label>
            <label className={styles.field} htmlFor="gantt-task-color">
              <span>{t('common.ganttColor')}</span>
              <select
                id="gantt-task-color"
                name="color"
                value={data.color}
                onChange={handleFieldChange}
              >
                {COLORS.map((color) => (
                  <option key={color} value={color}>
                    {t(`common.ganttColor_${color}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!isSummary && (
            <label className={styles.field} htmlFor="gantt-task-progress">
              <span>{t('common.ganttProgress')}</span>
              <div className={styles.progressInput}>
                <input
                  id="gantt-task-progress"
                  name="progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={data.progress}
                  onChange={handleFieldChange}
                />
                <output htmlFor="gantt-task-progress">{data.progress}%</output>
              </div>
            </label>
          )}

          {!isSummary && (
            <label className={styles.field} htmlFor="gantt-task-duration">
              <span>{t('common.ganttExpectedDuration')}</span>
              <div className={styles.durationInput}>
                <input
                  id="gantt-task-duration"
                  type="number"
                  min="1"
                  step="1"
                  value={data.expectedDurationDays}
                  aria-describedby="gantt-task-duration-help"
                  onChange={handleDurationChange}
                />
                <span aria-hidden="true">
                  {t('common.ganttDayUnit', { count: Number(data.expectedDurationDays) })}
                </span>
              </div>
              <small id="gantt-task-duration-help">{t('common.ganttDurationHelp')}</small>
            </label>
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
              <Button variant="secondary" type="button" onClick={() => onAddSubtask(item.id)}>
                {t('common.ganttAddSubtask')}
              </Button>
            )}
            {item && (
              <Button
                variant="danger-soft"
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
              >
                {t('common.delete')}
              </Button>
            )}
            <Button variant="secondary" type="button" disabled={isSubmitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
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
  statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
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
