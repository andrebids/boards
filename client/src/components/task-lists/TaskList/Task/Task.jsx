/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
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
import Linkify from '../../../common/Linkify';
import UserAvatar from '../../../users/UserAvatar';
import { useGantt } from '../../../gantt';
import AddTask from '../AddTask';

import styles from './Task.module.scss';

const Task = React.memo(({ id, index, isSubtask }) => {
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

  const handleClick = useCallback(() => {
    if (isEditable) {
      setIsEditNameOpened(true);
    }
  }, [isEditable]);

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
        isDragDisabled={isSubtask || isEditNameOpened || !isEditable}
      >
        {({ innerRef, draggableProps, dragHandleProps }, { isDragging }) => {
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
                    <Icon fitted name="add user" size="small" />
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

          const contentNode = (
            <div
              {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
              {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
              ref={innerRef}
              className={classNames(
                styles.wrapper,
                isSubtask && styles.wrapperSubtask,
                isDragging && styles.wrapperDragging,
              )}
            >
              <span className={styles.checkboxWrapper}>
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
                  <span
                    className={classNames(styles.text, canEdit && styles.textEditable)}
                    onClick={handleClick}
                  >
                    <span
                      className={classNames(styles.task, task.isCompleted && styles.taskCompleted)}
                    >
                      <Linkify linkStopPropagation>{task.name}</Linkify>
                    </span>
                    {childTasks.length > 0 && (
                      <span
                        className={styles.subtaskProgress}
                        aria-label={`${childTasks.filter((childTask) => childTask.isCompleted).length}/${childTasks.length}`}
                      >
                        {childTasks.filter((childTask) => childTask.isCompleted).length}/
                        {childTasks.length}
                      </span>
                    )}
                  </span>
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
                          <ActionsPopup
                            taskId={id}
                            canEditTask={isEditable}
                            onNameEdit={handleNameEdit}
                            onAddSubtask={isSubtask ? undefined : handleAddSubtask}
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
            </div>
          );

          return isDragging ? ReactDOM.createPortal(contentNode, document.body) : contentNode;
        }}
      </Draggable>
      {!isSubtask && (
        <AddTask
          taskListId={task.taskListId}
          parentTaskId={id}
          isOpened={isAddSubtaskOpened}
          onClose={handleAddSubtaskClose}
        >
          <button type="button" className={styles.addSubtaskButton} onClick={handleAddSubtask}>
            <Icon fitted name="add" size="small" />
            <span>{t('action.addSubtask')}</span>
          </button>
        </AddTask>
      )}
    </>
  );
});

Task.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isSubtask: PropTypes.bool.isRequired,
};

export default Task;
