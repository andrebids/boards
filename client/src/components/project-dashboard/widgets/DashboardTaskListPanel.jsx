import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon, Progress } from 'semantic-ui-react';

import Markdown from '../../common/Markdown';
import { buildTaskRows } from '../../task-lists/TaskList/task-tree';
import UserAvatar from '../../users/UserAvatar';

import styles from './DashboardTaskListPanel.module.scss';

const DashboardTaskListPanel = React.memo(({ error, isLoading, taskList, tasks }) => {
  const rows = useMemo(() => buildTaskRows(tasks), [tasks]);
  const parentTaskIds = useMemo(
    () => new Set(tasks.map(({ parentTaskId }) => parentTaskId).filter(Boolean)),
    [tasks],
  );
  const leafTasks = useMemo(
    () => tasks.filter(({ id }) => !parentTaskIds.has(id)),
    [parentTaskIds, tasks],
  );
  const completedTasks = leafTasks.filter(({ isCompleted }) => isCompleted).length;

  return (
    <section className={styles.wrapper} aria-label={taskList?.name || 'Task list do dashboard'}>
      <div className={styles.module}>
        <Icon name="check square outline" className={styles.moduleIcon} />
        <header className={styles.moduleHeader}>
          <strong>{taskList?.name || 'Lista indisponível'}</strong>
        </header>
        {!isLoading && !error && taskList && tasks.length > 0 && (
          <div className={styles.progressRow}>
            <Progress
              value={completedTasks}
              total={leafTasks.length}
              color="blue"
              size="tiny"
              aria-label={`${taskList.name}: ${completedTasks}/${leafTasks.length}`}
              aria-valuemin={0}
              aria-valuemax={leafTasks.length}
              aria-valuenow={completedTasks}
              className={styles.progress}
            />
            <span className={styles.count} aria-hidden="true">
              {completedTasks}/{leafTasks.length}
            </span>
          </div>
        )}
        <div className={styles.content}>
          {isLoading && (
            <div className={styles.state} role="status">
              A carregar lista…
            </div>
          )}
          {!isLoading && error && (
            <div className={styles.state} role="alert">
              <Icon name="warning circle" />
              Não foi possível carregar a lista.
            </div>
          )}
          {!isLoading && !error && !taskList && (
            <div className={styles.state} role="status">
              <Icon name="list alternate outline" />A lista configurada já não está disponível.
            </div>
          )}
          {!isLoading && !error && taskList && tasks.length === 0 && (
            <div className={styles.state} role="status">
              <Icon name="check circle outline" />
              Esta lista não tem tarefas.
            </div>
          )}
          {!isLoading && !error && taskList && tasks.length > 0 && (
            <ul className={styles.tasks}>
              {rows.map(({ task, depth }) => (
                <li
                  className={`${styles.taskRow} ${depth > 0 ? styles.taskRowNested : ''}`}
                  key={task.id}
                  style={{ '--task-depth': Math.min(depth, 4) }}
                >
                  <span
                    aria-hidden="true"
                    className={`${styles.checkbox} ${task.isCompleted ? styles.checkboxCompleted : ''}`}
                  />
                  <div className={styles.taskContent}>
                    <div
                      className={`${styles.taskText} ${task.isCompleted ? styles.taskCompleted : ''}`}
                    >
                      <Markdown>{task.content || task.name}</Markdown>
                    </div>
                  </div>
                  {task.assigneeUserId && (
                    <UserAvatar
                      id={task.assigneeUserId}
                      size="tiny"
                      className={styles.assigneeUserAvatar}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
});

DashboardTaskListPanel.propTypes = {
  error: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  taskList: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }),
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      assigneeUserId: PropTypes.string,
      content: PropTypes.string,
      id: PropTypes.string.isRequired,
      isCompleted: PropTypes.bool,
      name: PropTypes.string,
      parentTaskId: PropTypes.string,
    }),
  ).isRequired,
};

DashboardTaskListPanel.defaultProps = {
  taskList: null,
};

export default DashboardTaskListPanel;
