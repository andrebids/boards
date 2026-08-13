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

const createInitialData = (item) => ({
  task: item?.task || '',
  assigneeUserIds: item?.assigneeUserIds || [],
  project: item?.project || '',
  status: item?.status || '',
  expectedDurationDays: item?.expectedDurationDays || 1,
  startDate: item?.startDate || '',
  endDate: item?.endDate || '',
});

const GanttItemPanel = React.memo(({ item, users, statuses, onSave, onDelete, onClose }) => {
  const [t] = useTranslation();
  const [data, setData] = useState(() => createInitialData(item));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const taskInputRef = useRef(null);

  useEffect(() => {
    setData(createInitialData(item));
    setError(null);
  }, [item]);

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
  const handleFieldChange = useCallback((event) => {
    const { name, value } = event.currentTarget;
    setData((current) => ({ ...current, [name]: value }));
  }, []);

  const handlePeopleChange = useCallback((_, { value }) => {
    setData((current) => ({ ...current, assigneeUserIds: value }));
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
          assigneeUserIds: data.assigneeUserIds,
          project: data.project.trim() || null,
          status: data.status.trim() || null,
          expectedDurationDays: Number(data.expectedDurationDays),
          startDate: data.startDate || null,
          endDate: data.endDate || null,
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
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('common.ganttDeleteTaskConfirmation'))) {
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
  }, [item, onClose, onDelete, t]);

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
          <label className={styles.field} htmlFor="gantt-task-project">
            <span>{t('common.project')}</span>
            <input
              id="gantt-task-project"
              name="project"
              value={data.project}
              maxLength={256}
              placeholder={t('common.ganttProjectPlaceholder')}
              onChange={handleFieldChange}
            />
          </label>
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
        </div>

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
          <small id="gantt-task-duration-help">
            {t('common.ganttDurationHelp')}
          </small>
        </label>

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

        {!data.startDate && (
          <p className={styles.unscheduledHint}>
            {t('common.ganttUnscheduledHint')}
          </p>
        )}

        {error && (
          <p id="gantt-item-error" className={styles.error} role="alert">
            {error}
          </p>
        )}

        <footer className={styles.footer}>
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
});

GanttItemPanel.propTypes = {
  item: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  users: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  statuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

GanttItemPanel.defaultProps = {
  item: null,
};

export default GanttItemPanel;
