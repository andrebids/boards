import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';

import Markdown from '../../common/Markdown';
import { buildTaskRows } from '../../task-lists/TaskList/task-tree';

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
      <header className={styles.header}>
        <div>
          <span>Task list</span>
          <strong>{taskList?.name || 'Lista indisponível'}</strong>
        </div>
        {!isLoading && taskList && (
          <small>
            {completedTasks}/{leafTasks.length} concluídas
          </small>
        )}
      </header>
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
                className={task.isCompleted ? styles.completed : undefined}
                key={task.id}
                style={{ '--task-depth': Math.min(depth, 4) }}
              >
                <Icon
                  aria-hidden="true"
                  fitted
                  name={task.isCompleted ? 'check circle' : 'circle outline'}
                />
                <div className={styles.taskText}>
                  <Markdown>{task.content || task.name}</Markdown>
                </div>
              </li>
            ))}
          </ul>
        )}
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
