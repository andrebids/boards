/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Draggable } from '@hello-pangea/dnd';
import { Checkbox, Icon } from 'semantic-ui-react';
import { Button } from '../../../../lib/custom-ui';
import { useDidUpdate } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { isListArchiveOrTrash } from '../../../../utils/record-helpers';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import { ClosableContext } from '../../../../contexts';
import EditName from './EditName';
import SelectAssigneeStep from './SelectAssigneeStep';
import ActionsStep from './ActionsStep';
import Markdown from '../../../common/Markdown';
import UserAvatar from '../../../users/UserAvatar';
import { useGantt } from '../../../gantt';
import AddTask from '../AddTask';
import TaskDragContext from '../TaskDragContext';
import buildTaskDragStyle, { getTaskVisualDepth } from './task-drag-style';

import styles from './Task.module.scss';

const Task = React.memo(({ id, index, depth, isCollapsed, onCollapseToggle }) => {
  const [t] = useTranslation();
  const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);

  const task = useSelector((state) => selectTaskById(state, id));
  const childTasks = useSelector((state) =>
    selectTasksByTaskListId(state, task.taskListId).filter(
      (childTask) => childTask.parentTaskId === id,
    ),
  );
  const isEditModeEnabled = useSelector(selectors.selectIsEditModeEnabled);
  const { plan, canEdit: canEditGantt } = useGantt();

  const { canEdit, canToggle } = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return {
        canEdit: false,
        canToggle: false,
      };
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    const isEditor = !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;

    return {
      canEdit: isEditor,
      canToggle: isEditor,
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const [isEditNameOpened, setIsEditNameOpened] = useState(false);
  const [isAddSubtaskOpened, setIsAddSubtaskOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);
  const taskDragPreview = useContext(TaskDragContext);
  const previewDepthRef = useRef(depth);

  if (taskDragPreview?.taskId === id && !taskDragPreview.isCancelled) {
    previewDepthRef.current = taskDragPreview.depth;
  }

  const handleToggleChange = useCallback(() => {
    dispatch(
      entryActions.updateTask(id, {
        isCompleted: !task.isCompleted,
      }),
    );
  }, [id, task.isCompleted, dispatch]);

  const handleUserSelect = useCallback(
    (userId) => {
      dispatch(
        entryActions.updateTask(id, {
          assigneeUserId: userId,
        }),
      );
    },
    [id, dispatch],
  );

  const handleUserDeselect = useCallback(() => {
    dispatch(
      entryActions.updateTask(id, {
        assigneeUserId: null,
      }),
    );
  }, [id, dispatch]);

  const isEditable = task.isPersisted && canEdit;
  const canUseGantt = task.isPersisted && plan?.isEnabled && canEditGantt && isEditModeEnabled;

  const handleClick = useCallback(
    (event) => {
      if (event.target.closest('a')) {
        return;
      }

      if (isEditable) {
        setIsEditNameOpened(true);
      }
    },
    [isEditable],
  );

  const handleNameEdit = useCallback(() => {
    setIsEditNameOpened(true);
  }, []);

  const handleEditNameClose = useCallback(() => {
    setIsEditNameOpened(false);
  }, []);

  const handleAddSubtask = useCallback(() => {
    setIsAddSubtaskOpened(true);
  }, []);

  const handleAddSubtaskClose = useCallback(() => {
    setIsAddSubtaskOpened(false);
  }, []);

  const handleCollapseToggle = useCallback(
    (event) => {
      event.stopPropagation();
      onCollapseToggle(id);
    },
    [id, onCollapseToggle],
  );

  useDidUpdate(() => {
    setIsClosableActive(isEditNameOpened);
  }, [isEditNameOpened]);

  const SelectAssigneePopup = usePopupInClosableContext(SelectAssigneeStep);
  const ActionsPopup = usePopupInClosableContext(ActionsStep);

  return (
    <>
      <Draggable
        draggableId={`task:${id}`}
        index={index}
        isDragDisabled={isEditNameOpened || !isEditable}
      >
        {(
          { innerRef, draggableProps, dragHandleProps },
          { isDragging, isDropAnimating, combineTargetFor },
        ) => {
          let assigneeControl = null;
          if (isEditable) {
            assigneeControl = (
              <SelectAssigneePopup
                currentUserId={task.assigneeUserId}
                onUserSelect={handleUserSelect}
                onUserDeselect={handleUserDeselect}
              >
                {task.assigneeUserId ? (
                  <UserAvatar
                    id={task.assigneeUserId}
                    size="tiny"
                    className={styles.assigneeUserAvatar}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    type="button"
                    aria-label={t('action.addMember')}
                    title={t('action.addMember')}
                    className={styles.button}
                  >
                    <Icon fitted name="user" size="small" />
                  </Button>
                )}
              </SelectAssigneePopup>
            );
          } else if (task.assigneeUserId) {
            assigneeControl = (
              <UserAvatar
                id={task.assigneeUserId}
                size="tiny"
                className={styles.assigneeUserAvatar}
              />
            );
          }

          const visualDepth = getTaskVisualDepth(
            id,
            depth,
            previewDepthRef.current,
            taskDragPreview,
            isDropAnimating,
          );
          const dropIndicator =
            taskDragPreview?.indicator?.taskListId === task.taskListId &&
            taskDragPreview.indicator.targetTaskId === id
              ? taskDragPreview.indicator
              : null;
          const isCombineTarget = Boolean(
            combineTargetFor || taskDragPreview?.combineTargetTaskId === id,
          );
          const contentNode = (
            <div
              {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
              {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
              ref={innerRef}
              style={
                isDragging
                  ? {
                      ...buildTaskDragStyle(draggableProps.style, depth, visualDepth),
                      '--task-drop-depth': dropIndicator?.depth ?? visualDepth,
                    }
                  : {
                      ...draggableProps.style,
                      '--task-depth': visualDepth,
                      '--task-drop-depth': dropIndicator?.depth ?? visualDepth,
                    }
              }
              className={classNames(
                isDragging && 'card-modal-theme',
                styles.wrapper,
                visualDepth > 0 && styles.wrapperNested,
                visualDepth > 0 && childTasks.length > 0 && styles.wrapperNestedCollapsible,
                isAddSubtaskOpened && styles.wrapperAddingSubtask,
                isCombineTarget && styles.wrapperCombineTarget,
                dropIndicator?.position === 'before' && styles.wrapperDropBefore,
                dropIndicator?.position === 'after' && styles.wrapperDropAfter,
                isDragging && styles.wrapperDragging,
              )}
            >
              <span className={styles.checkboxWrapper}>
                {childTasks.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={t(isCollapsed ? 'common.expandPanel' : 'common.collapsePanel')}
                    title={t(isCollapsed ? 'common.expandPanel' : 'common.collapsePanel')}
                    className={styles.collapseButton}
                    onClick={handleCollapseToggle}
                  >
                    <Icon fitted name={isCollapsed ? 'caret right' : 'caret down'} size="small" />
                  </button>
                )}
                <Checkbox
                  aria-label={task.name}
                  checked={task.isCompleted}
                  disabled={childTasks.length > 0 || !task.isPersisted || !canToggle}
                  className={styles.checkbox}
                  onChange={handleToggleChange}
                />
              </span>
              {isEditNameOpened ? (
                <EditName taskId={id} onClose={handleEditNameClose} />
              ) : (
                <div className={classNames(canEdit && styles.contentHoverable)}>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                             jsx-a11y/no-static-element-interactions */}
                  <div
                    className={classNames(styles.text, canEdit && styles.textEditable)}
                    onClick={handleClick}
                  >
                    <div
                      className={classNames(styles.task, task.isCompleted && styles.taskCompleted)}
                    >
                      <Markdown>{task.content || task.name}</Markdown>
                    </div>
                    {childTasks.length > 0 && (
                      <span
                        className={styles.subtaskProgress}
                        aria-label={`${childTasks.filter((childTask) => childTask.isCompleted).length}/${childTasks.length}`}
                      >
                        {childTasks.filter((childTask) => childTask.isCompleted).length}/
                        {childTasks.length}
                      </span>
                    )}
                  </div>
                  {(task.assigneeUserId || isEditable || canUseGantt) && (
                    <div
                      className={classNames(
                        styles.actions,
                        (isEditable || canUseGantt) && styles.actionsEditable,
                      )}
                    >
                      {isEditable || canUseGantt ? (
                        <>
                          {assigneeControl}
                          {isEditable && (
                            <Button
                              variant="secondary"
                              type="button"
                              aria-label={t('action.addSubtask')}
                              title={t('action.addSubtask')}
                              className={styles.button}
                              onClick={handleAddSubtask}
                            >
                              <Icon fitted name="add" size="small" />
                            </Button>
                          )}
                          <ActionsPopup
                            taskId={id}
                            childTaskCount={childTasks.length}
                            canEditTask={isEditable}
                            onNameEdit={handleNameEdit}
                          >
                            <Button
                              variant="secondary"
                              type="button"
                              aria-label={t('action.edit')}
                              title={t('action.edit')}
                              className={styles.button}
                            >
                              <Icon fitted name="pencil" size="small" />
                            </Button>
                          </ActionsPopup>
                        </>
                      ) : (
                        <UserAvatar
                          id={task.assigneeUserId}
                          size="tiny"
                          className={styles.assigneeUserAvatar}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
              {dropIndicator?.position === 'inside' && (
                <span className={styles.dropPreview} aria-hidden="true">
                  <span className={styles.dropPreviewCheckbox} />
                  <span className={styles.dropPreviewText} />
                </span>
              )}
            </div>
          );

          return isDragging
            ? ReactDOM.createPortal(contentNode, document.getElementById('app'))
            : contentNode;
        }}
      </Draggable>
      {isAddSubtaskOpened && (
        <AddTask
          taskListId={task.taskListId}
          parentTaskId={id}
          parentTaskName={task.name}
          depth={depth + 1}
          isOpened={isAddSubtaskOpened}
          onClose={handleAddSubtaskClose}
        >
          <span />
        </AddTask>
      )}
    </>
  );
});

Task.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onCollapseToggle: PropTypes.func.isRequired,
};

export default Task;
