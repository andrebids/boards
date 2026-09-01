import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon, Progress } from 'semantic-ui-react';

import Markdown from '../../common/Markdown';
import { buildTaskRows } from '../../task-lists/TaskList/task-tree';
import CardMembers from '../../cards/Card/CardMembers';
import { getTaskAssigneeUserIds } from '../../../utils/task-assignees';
import { getDashboardTaskListLayout } from './dashboardTaskList';

import styles from './DashboardTaskListPanel.module.scss';

const DashboardTaskListPanel = React.memo(({ error, isLoading, taskList, tasks }) => {
  const contentRef = useRef(null);
  const rows = useMemo(() => buildTaskRows(tasks), [tasks]);
  const [taskLayout, setTaskLayout] = useState(() => getDashboardTaskListLayout(rows.length, 0));
  const childTasksByParentId = useMemo(
    () =>
      tasks.reduce((result, task) => {
        if (task.parentTaskId) {
          result.set(task.parentTaskId, [...(result.get(task.parentTaskId) || []), task]);
        }

        return result;
      }, new Map()),
    [tasks],
  );
  const leafTasks = useMemo(
    () => tasks.filter(({ id }) => !childTasksByParentId.has(id)),
    [childTasksByParentId, tasks],
  );
  const completedTasks = leafTasks.filter(({ isCompleted }) => isCompleted).length;

  useLayoutEffect(() => {
    const contentNode = contentRef.current;

    if (!contentNode) {
      return undefined;
    }

    const updateLayout = () => {
      setTaskLayout(getDashboardTaskListLayout(rows.length, contentNode.clientHeight));
    };

    updateLayout();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateLayout);

      return () => window.removeEventListener('resize', updateLayout);
    }

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(contentNode);

    return () => resizeObserver.disconnect();
  }, [rows.length]);

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
        <div ref={contentRef} className={styles.content}>
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
            <ul
              className={styles.tasks}
              style={{
                '--task-list-columns': taskLayout.columns,
                '--task-list-rows': taskLayout.rows,
              }}
            >
              {rows.map(({ task, depth }) => {
                const childTasks = childTasksByParentId.get(task.id) || [];
                const assigneeUserIds = getTaskAssigneeUserIds(task);

                return (
                  <li
                    className={styles.taskRow}
                    key={task.id}
                    style={{ '--task-depth': Math.min(depth, 5) }}
                  >
                    <span className={styles.checkboxWrapper} aria-hidden="true">
                      {childTasks.length > 0 && (
                        <Icon
                          fitted
                          name="caret down"
                          size="small"
                          className={styles.collapseIcon}
                        />
                      )}
                      <span
                        className={`${styles.checkbox} ${task.isCompleted ? styles.checkboxCompleted : ''}`}
                      />
                    </span>
                    <div className={styles.taskContent}>
                      <div className={styles.taskText}>
                        <div
                          className={`${styles.taskName} ${task.isCompleted ? styles.taskCompleted : ''}`}
                        >
                          <Markdown>{task.content || task.name}</Markdown>
                        </div>
                        {childTasks.length > 0 && (
                          <span className={styles.subtaskProgress}>
                            {childTasks.filter(({ isCompleted }) => isCompleted).length}/
                            {childTasks.length}
                          </span>
                        )}
                      </div>
                      {assigneeUserIds.length > 0 && (
                        <span className={styles.actions}>
                          <CardMembers userIds={assigneeUserIds} />
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
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
      assigneeUserIds: PropTypes.arrayOf(PropTypes.string),
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
