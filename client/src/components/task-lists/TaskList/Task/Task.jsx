/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Checkbox, Icon } from 'semantic-ui-react';
import { Button } from '../../../../lib/custom-ui';
import { useDidUpdate } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import { isListArchiveOrTrash } from '../../../../utils/record-helpers';
import { getTaskAssigneeUserIds, toggleTaskAssignee } from '../../../../utils/task-assignees';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import { ClosableContext } from '../../../../contexts';
import EditName from './EditName';
import SelectAssigneeStep from './SelectAssigneeStep';
import ActionsStep from './ActionsStep';
import Markdown from '../../../common/Markdown';
import CardMembers from '../../../cards/Card/CardMembers';
import { useGantt } from '../../../gantt';
import AddTask from '../AddTask';
import getTaskKeyboardMove from './keyboard-move';

import styles from './Task.module.scss';

const Task = React.memo(
  React.forwardRef(
    (
      {
        id,
        depth,
        isCollapsed,
        onCollapseToggle,
        dragHandleProps,
        isDragging,
        isDropTarget,
        wasRecentlyDropped,
        onKeyboardMove,
      },
      ref,
    ) => {
      const [t] = useTranslation();
      const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);
      const selectListById = useMemo(() => selectors.makeSelectListById(), []);
      const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);

      const task = useSelector((state) => selectTaskById(state, id));
      const tasks = useSelector(
        (state) => selectTasksByTaskListId(state, task.taskListId),
        shallowEqual,
      );
      const childTasks = useMemo(
        () => tasks.filter((childTask) => childTask.parentTaskId === id),
        [id, tasks],
      );
      const assigneeUserIds = getTaskAssigneeUserIds(task);
      const assigneeUserIdsRef = useRef(assigneeUserIds);
      assigneeUserIdsRef.current = assigneeUserIds;
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

      const handleToggleChange = useCallback(() => {
        dispatch(
          entryActions.updateTask(id, {
            isCompleted: !task.isCompleted,
          }),
        );
      }, [id, task.isCompleted, dispatch]);

      const handleUserSelect = useCallback(
        (userId) => {
          const nextAssigneeUserIds = toggleTaskAssignee(assigneeUserIdsRef.current, userId, true);
          assigneeUserIdsRef.current = nextAssigneeUserIds;
          dispatch(
            entryActions.updateTask(id, {
              assigneeUserIds: nextAssigneeUserIds,
            }),
          );
        },
        [id, dispatch],
      );

      const handleUserDeselect = useCallback(
        (userId) => {
          const nextAssigneeUserIds = toggleTaskAssignee(assigneeUserIdsRef.current, userId, false);
          assigneeUserIdsRef.current = nextAssigneeUserIds;
          dispatch(
            entryActions.updateTask(id, {
              assigneeUserIds: nextAssigneeUserIds,
            }),
          );
        },
        [id, dispatch],
      );

      const handleAssigneesClear = useCallback(() => {
        assigneeUserIdsRef.current = [];
        dispatch(entryActions.updateTask(id, { assigneeUserIds: [] }));
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

      const handleDragKeyDown = useCallback(
        (event) => {
          const directionsByKey = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowRight: 'in',
            ArrowLeft: 'out',
          };
          const direction = event.altKey && directionsByKey[event.key];

          if (!direction) {
            dragHandleProps?.onKeyDown?.(event);
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const move = getTaskKeyboardMove(tasks, id, direction);
          if (move) {
            onKeyboardMove(id, move);
          }
        },
        [dragHandleProps, id, onKeyboardMove, tasks],
      );

      useDidUpdate(() => {
        setIsClosableActive(isEditNameOpened);
      }, [isEditNameOpened]);

      const SelectAssigneePopup = usePopupInClosableContext(SelectAssigneeStep);
      const ActionsPopup = usePopupInClosableContext(ActionsStep);

      let assigneeControl = null;
      if (isEditable) {
        assigneeControl = (
          <SelectAssigneePopup
            currentUserIds={assigneeUserIds}
            onUserSelect={handleUserSelect}
            onUserDeselect={handleUserDeselect}
            onClear={handleAssigneesClear}
          >
            {assigneeUserIds.length > 0 ? (
              <button
                type="button"
                aria-label={t('common.selectAssignee', { context: 'title' })}
                title={t('common.selectAssignee', { context: 'title' })}
                className={styles.assigneesButton}
              >
                <CardMembers userIds={assigneeUserIds} />
              </button>
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
      } else if (assigneeUserIds.length > 0) {
        assigneeControl = <CardMembers userIds={assigneeUserIds} />;
      }

      return (
        <>
          <div
            ref={ref}
            style={{ '--task-depth': depth, '--task-drop-depth': depth }}
            className={classNames(
              isDragging && 'card-modal-theme',
              styles.wrapper,
              depth > 0 && styles.wrapperNested,
              isEditNameOpened && styles.wrapperEditing,
              isAddSubtaskOpened && styles.wrapperAddingSubtask,
              isDropTarget && styles.wrapperCombineTarget,
              wasRecentlyDropped && styles.wrapperRecentlyDropped,
              isDragging && styles.wrapperDragging,
            )}
          >
            {isEditable && !isEditNameOpened && dragHandleProps && (
              <button
                type="button"
                aria-label={t('common.dragTask')}
                aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
                title={t('common.dragTaskKeyboardHint')}
                className={styles.dragHandle}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...dragHandleProps}
                onKeyDown={handleDragKeyDown}
              >
                <Icon fitted name="ellipsis vertical" size="small" />
              </button>
            )}
            <span className={styles.checkboxWrapper}>
              {childTasks.length > 0 && onCollapseToggle && (
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
                {(assigneeUserIds.length > 0 || isEditable || canUseGantt) && (
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
                      <CardMembers userIds={assigneeUserIds} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
    },
  ),
);

Task.propTypes = {
  id: PropTypes.string.isRequired,
  depth: PropTypes.number.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onCollapseToggle: PropTypes.func,
  dragHandleProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  isDragging: PropTypes.bool.isRequired,
  isDropTarget: PropTypes.bool.isRequired,
  wasRecentlyDropped: PropTypes.bool.isRequired,
  onKeyboardMove: PropTypes.func.isRequired,
};

Task.defaultProps = {
  onCollapseToggle: undefined,
  dragHandleProps: undefined,
};

export default Task;
