/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { SortableTree } from 'dnd-kit-sortable-tree';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import SortableTaskTreeItem from './SortableTaskTreeItem';
import { buildSortableTaskTree, getSortableTreeMove } from './sortable-task-tree';

import styles from './SortableTaskTree.module.scss';

const TaskLists = React.memo(() => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const taskListIds = useSelector(selectors.selectTaskListIdsForCurrentCard);
  const tasksByTaskListId = useSelector(selectors.selectTasksByTaskListIdForCurrentCard);
  const [collapsedTaskIdsByTaskListId, setCollapsedTaskIdsByTaskListId] = useState({});
  const [recentlyDroppedId, setRecentlyDroppedId] = useState(null);
  const settledTimeoutRef = useRef(null);
  const prefersReducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const items = useMemo(
    () =>
      buildSortableTaskTree({
        taskListIds,
        tasksByTaskListId,
        collapsedTaskIdsByTaskListId,
      }),
    [collapsedTaskIdsByTaskListId, taskListIds, tasksByTaskListId],
  );

  const setTaskCollapsed = useCallback((taskListId, taskId, isCollapsed) => {
    setCollapsedTaskIdsByTaskListId((previousValue) => {
      const nextTaskIds = new Set(previousValue[taskListId] || []);

      if (isCollapsed) {
        nextTaskIds.add(taskId);
      } else {
        nextTaskIds.delete(taskId);
      }

      return {
        ...previousValue,
        [taskListId]: nextTaskIds,
      };
    });
  }, []);

  const markDropSettled = useCallback((nodeId) => {
    if (settledTimeoutRef.current) {
      clearTimeout(settledTimeoutRef.current);
    }

    setRecentlyDroppedId(nodeId);
    settledTimeoutRef.current = setTimeout(() => {
      setRecentlyDroppedId(null);
      settledTimeoutRef.current = null;
    }, 420);
  }, []);

  useEffect(
    () => () => {
      if (settledTimeoutRef.current) {
        clearTimeout(settledTimeoutRef.current);
      }
    },
    [],
  );

  const handleItemsChanged = useCallback(
    (nextItems, reason) => {
      if (reason.type === 'collapsed' || reason.type === 'expanded') {
        if (reason.item.kind === 'task') {
          setTaskCollapsed(
            reason.item.taskListId,
            reason.item.recordId,
            reason.type === 'collapsed',
          );
        }
        return;
      }

      const move = getSortableTreeMove(nextItems, reason);
      if (!move) {
        return;
      }

      if (move.type === 'taskList') {
        if (taskListIds.indexOf(move.id) !== move.index) {
          dispatch(entryActions.moveTaskList(move.id, move.index));
          markDropSettled(reason.draggedItem.id);
        }
        return;
      }

      const sourceTasks = tasksByTaskListId[reason.draggedItem.taskListId] || [];
      const task = sourceTasks.find((currentTask) => currentTask.id === move.id);
      const sourceIndex = sourceTasks
        .filter(
          (currentTask) => (currentTask.parentTaskId || null) === (task?.parentTaskId || null),
        )
        .findIndex((currentTask) => currentTask.id === move.id);
      const isSameLocation =
        task &&
        task.taskListId === move.taskListId &&
        (task.parentTaskId || null) === move.parentTaskId &&
        sourceIndex === move.index;

      if (isSameLocation) {
        return;
      }

      if (move.parentTaskId) {
        setTaskCollapsed(move.taskListId, move.parentTaskId, false);
      }

      dispatch(entryActions.moveTask(move.id, move.taskListId, move.parentTaskId, move.index));
      markDropSettled(reason.draggedItem.id);
    },
    [dispatch, markDropSettled, setTaskCollapsed, taskListIds, tasksByTaskListId],
  );

  const handleKeyboardMove = useCallback(
    (taskId, move) => {
      if (move.parentTaskId) {
        setTaskCollapsed(move.taskListId, move.parentTaskId, false);
      }

      dispatch(entryActions.moveTask(taskId, move.taskListId, move.parentTaskId, move.index));
    },
    [dispatch, setTaskCollapsed],
  );

  const handleTaskListKeyboardMove = useCallback(
    (taskListId, direction) => {
      const currentIndex = taskListIds.indexOf(taskListId);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex >= 0 && nextIndex < taskListIds.length) {
        dispatch(entryActions.moveTaskList(taskListId, nextIndex));
      }
    },
    [dispatch, taskListIds],
  );

  return (
    <ul role="tree" aria-label={t('common.taskTree')} className={styles.tree}>
      <SortableTree
        items={items}
        onItemsChanged={handleItemsChanged}
        TreeItemComponent={SortableTaskTreeItem}
        indentationWidth={24}
        manualDrag
        showDragHandle
        pointerSensorOptions={{
          activationConstraint: {
            distance: 4,
          },
        }}
        dropAnimation={prefersReducedMotion ? null : undefined}
        canRootHaveChildren={(draggedItem) => draggedItem.kind === 'taskList'}
        recentlyDroppedId={recentlyDroppedId}
        onKeyboardMove={handleKeyboardMove}
        onTaskListKeyboardMove={handleTaskListKeyboardMove}
      />
    </ul>
  );
});

export default TaskLists;
