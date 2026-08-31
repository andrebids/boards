/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Droppable } from '@hello-pangea/dnd';
import { Icon, Progress } from 'semantic-ui-react';
import { useDidUpdate } from '../../../lib/hooks';

import selectors from '../../../selectors';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import DroppableTypes from '../../../constants/DroppableTypes';
import { BoardMembershipRoles } from '../../../constants/Enums';
import { ClosableContext } from '../../../contexts';
import Task from './Task';
import AddTask from './AddTask';
import { buildTaskRows } from './task-tree';
import TaskDragContext from './TaskDragContext';

import styles from './TaskList.module.scss';

const TaskList = React.memo(({ id, collapsedTaskIds, onCollapseToggle }) => {
  const selectTaskListById = useMemo(() => selectors.makeSelectTaskListById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);

  const taskList = useSelector((state) => selectTaskListById(state, id));
  const tasks = useSelector((state) => selectTasksByTaskListId(state, id));

  const canEdit = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
  });

  const [t] = useTranslation();
  const [isAddOpened, setIsAddOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);
  const taskDragPreview = useContext(TaskDragContext);
  const showsEmptyDropIndicator =
    taskDragPreview?.indicator?.taskListId === id &&
    taskDragPreview.indicator.position === 'empty';

  const leafTasks = useMemo(
    () => tasks.filter((task) => !tasks.some((childTask) => childTask.parentTaskId === task.id)),
    [tasks],
  );
  const taskRows = useMemo(() => buildTaskRows(tasks, collapsedTaskIds), [collapsedTaskIds, tasks]);

  // TODO: move to selector?
  const completedTasksTotal = useMemo(
    () => leafTasks.reduce((result, task) => (task.isCompleted ? result + 1 : result), 0),
    [leafTasks],
  );

  const handleAddClick = useCallback(() => {
    setIsAddOpened(true);
  }, []);

  const handleAddClose = useCallback(() => {
    setIsAddOpened(false);
  }, []);

  useDidUpdate(() => {
    setIsClosableActive(isAddOpened);
  }, [isAddOpened]);

  return (
    <>
      {tasks.length > 0 && (
        <div className={styles.progressRow}>
          <span className={styles.progressWrapper}>
            <Progress
              value={completedTasksTotal}
              total={leafTasks.length}
              color="blue"
              size="tiny"
              aria-label={`${taskList.name}: ${completedTasksTotal}/${leafTasks.length}`}
              aria-valuemin={0}
              aria-valuemax={leafTasks.length}
              aria-valuenow={completedTasksTotal}
              className={styles.progress}
            />
          </span>
          <span className={styles.count} aria-hidden="true">
            {completedTasksTotal}/{leafTasks.length}
          </span>
        </div>
      )}
      <Droppable
        droppableId={`task-list:${id}`}
        type={DroppableTypes.TASK}
        isCombineEnabled
        isDropDisabled={!taskList.isPersisted || !canEdit}
      >
        {({ innerRef, droppableProps, placeholder }) => (
          <div
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...droppableProps}
            ref={innerRef}
            role="group"
            aria-label={taskList.name}
            className={styles.tasks}
          >
            {taskRows.map(({ task, depth }, index) => (
              <Task
                key={task.id}
                id={task.id}
                index={index}
                depth={depth}
                isCollapsed={collapsedTaskIds.has(task.id)}
                onCollapseToggle={onCollapseToggle}
              />
            ))}
            {showsEmptyDropIndicator && <div className={styles.emptyDropIndicator} />}
            {placeholder}
          </div>
        )}
      </Droppable>
      {canEdit && (
        <AddTask taskListId={id} isOpened={isAddOpened} onClose={handleAddClose}>
          <button
            type="button"
            disabled={!taskList.isPersisted}
            className={styles.taskButton}
            onClick={handleAddClick}
          >
            <Icon fitted name="add" size="small" />
            <span className={styles.taskButtonText}>
              {tasks.length > 0 ? t('action.addAnotherTask') : t('action.addTask')}
            </span>
          </button>
        </AddTask>
      )}
    </>
  );
});

TaskList.propTypes = {
  id: PropTypes.string.isRequired,
  collapsedTaskIds: PropTypes.instanceOf(Set).isRequired,
  onCollapseToggle: PropTypes.func.isRequired,
};

export default TaskList;
