/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { closePopup } from '../../../../lib/popup';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import parseDndId from '../../../../utils/parse-dnd-id';
import DroppableTypes from '../../../../constants/DroppableTypes';
import { resolveTaskDrop } from '../../../task-lists/TaskList/task-tree';
import Item from './Item';

import globalStyles from '../../../../styles.module.scss';

const EMPTY_TASK_IDS = new Set();

const TaskLists = React.memo(() => {
  const taskListIds = useSelector(selectors.selectTaskListIdsForCurrentCard);
  const tasksByTaskListId = useSelector(selectors.selectTasksByTaskListIdForCurrentCard);
  const [collapsedTaskIdsByTaskListId, setCollapsedTaskIdsByTaskListId] = useState({});
  const combineTargetRef = useRef(null);
  const expandTimeoutRef = useRef(null);

  const dispatch = useDispatch();

  const clearExpandTimeout = useCallback(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    combineTargetRef.current = null;
  }, []);

  const handleTaskCollapseToggle = useCallback((taskListId, taskId) => {
    setCollapsedTaskIdsByTaskListId((previousValue) => {
      const collapsedTaskIds = new Set(previousValue[taskListId] || []);
      if (collapsedTaskIds.has(taskId)) {
        collapsedTaskIds.delete(taskId);
      } else {
        collapsedTaskIds.add(taskId);
      }

      return {
        ...previousValue,
        [taskListId]: collapsedTaskIds,
      };
    });
  }, []);

  const expandTask = useCallback((taskListId, taskId) => {
    setCollapsedTaskIdsByTaskListId((previousValue) => {
      const collapsedTaskIds = previousValue[taskListId];
      if (!collapsedTaskIds || !collapsedTaskIds.has(taskId)) {
        return previousValue;
      }

      const nextCollapsedTaskIds = new Set(collapsedTaskIds);
      nextCollapsedTaskIds.delete(taskId);
      return {
        ...previousValue,
        [taskListId]: nextCollapsedTaskIds,
      };
    });
  }, []);

  const handleDragStart = useCallback(() => {
    clearExpandTimeout();
    document.body.classList.add(globalStyles.dragging);
    closePopup();
  }, [clearExpandTimeout]);

  const handleDragUpdate = useCallback(
    ({ type, combine }) => {
      if (type !== DroppableTypes.TASK || !combine) {
        clearExpandTimeout();
        return;
      }

      const taskListId = parseDndId(combine.droppableId);
      const taskId = parseDndId(combine.draggableId);
      const nextTarget = `${taskListId}:${taskId}`;
      if (combineTargetRef.current === nextTarget) {
        return;
      }

      clearExpandTimeout();
      combineTargetRef.current = nextTarget;
      expandTimeoutRef.current = setTimeout(() => {
        expandTask(taskListId, taskId);
        expandTimeoutRef.current = null;
      }, 500);
    },
    [clearExpandTimeout, expandTask],
  );

  const handleDragEnd = useCallback(
    ({ draggableId, type, source, destination, combine }) => {
      clearExpandTimeout();
      document.body.classList.remove(globalStyles.dragging);

      const id = parseDndId(draggableId);

      switch (type) {
        case DroppableTypes.TASK_LIST: {
          if (!destination) {
            return;
          }
          if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
          ) {
            return;
          }

          dispatch(entryActions.moveTaskList(id, destination.index));

          break;
        }
        case DroppableTypes.TASK: {
          if (!destination && !combine) {
            return;
          }

          const sourceTaskListId = parseDndId(source.droppableId);
          const destinationTaskListId = parseDndId(
            combine ? combine.droppableId : destination.droppableId,
          );
          const result = resolveTaskDrop({
            taskId: id,
            sourceTaskListId,
            sourceIndex: source.index,
            destinationTaskListId,
            destinationIndex: destination && destination.index,
            combineTaskId: combine && parseDndId(combine.draggableId),
            tasksByTaskListId,
            collapsedTaskIdsByTaskListId,
          });

          if (!result) {
            return;
          }

          if (result.parentTaskId) {
            expandTask(result.taskListId, result.parentTaskId);
          }

          dispatch(entryActions.moveTask(id, result.taskListId, result.parentTaskId, result.index));

          break;
        }
        default:
      }
    },
    [clearExpandTimeout, collapsedTaskIdsByTaskListId, dispatch, expandTask, tasksByTaskListId],
  );

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <Droppable droppableId="card" type={DroppableTypes.TASK_LIST} direction="vertical">
        {({ innerRef, droppableProps, placeholder }) => (
          // eslint-disable-next-line react/jsx-props-no-spreading
          <div {...droppableProps} ref={innerRef}>
            {taskListIds.map((taskListId, index) => (
              <Item
                key={taskListId}
                id={taskListId}
                index={index}
                collapsedTaskIds={collapsedTaskIdsByTaskListId[taskListId] || EMPTY_TASK_IDS}
                onTaskCollapseToggle={handleTaskCollapseToggle}
              />
            ))}
            {placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
});

export default TaskLists;
