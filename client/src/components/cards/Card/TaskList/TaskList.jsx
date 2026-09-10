/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Progress } from 'semantic-ui-react';
import { useToggle } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import { buildTaskRows } from '../../../task-lists/TaskList/task-tree';
import Task from './Task';

import styles from './TaskList.module.scss';

const TaskList = React.memo(({ id }) => {
  const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);

  const tasks = useSelector((state) => selectTasksByTaskListId(state, id));

  const [isOpened, toggleOpened] = useToggle();
  const [collapsedTaskIds, setCollapsedTaskIds] = useState(() => new Set());
  const taskRows = useMemo(() => buildTaskRows(tasks, collapsedTaskIds), [tasks, collapsedTaskIds]);

  const handleCollapseToggle = useCallback((taskId) => {
    setCollapsedTaskIds((previous) => {
      const next = new Set(previous);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const leafTasks = useMemo(
    () => tasks.filter((task) => !tasks.some((childTask) => childTask.parentTaskId === task.id)),
    [tasks],
  );

  // TODO: move to selector?
  const completedTasksTotal = useMemo(
    () => leafTasks.reduce((result, task) => (task.isCompleted ? result + 1 : result), 0),
    [leafTasks],
  );

  const handleToggleClick = useCallback(
    (event) => {
      event.stopPropagation();
      toggleOpened();
    },
    [toggleOpened],
  );

  if (tasks.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-expanded={isOpened}
        onClick={handleToggleClick}
      >
        <span className={styles.progressWrapper}>
          <Progress
            autoSuccess
            value={completedTasksTotal}
            total={leafTasks.length}
            color="blue"
            size="tiny"
            className={styles.progress}
          />
        </span>
        <span
          className={classNames(styles.count, isOpened ? styles.countOpened : styles.countClosed)}
        >
          {completedTasksTotal}/{leafTasks.length}
        </span>
      </button>
      {isOpened && (
        <ul className={styles.tasks}>
          {taskRows.map(({ task, depth }) => (
            <Task
              key={task.id}
              task={task}
              depth={depth}
              childTasks={tasks.filter((childTask) => childTask.parentTaskId === task.id)}
              isCollapsed={collapsedTaskIds.has(task.id)}
              onCollapseToggle={handleCollapseToggle}
            />
          ))}
        </ul>
      )}
    </>
  );
});

TaskList.propTypes = {
  id: PropTypes.string.isRequired,
};

export default TaskList;
