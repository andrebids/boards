/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Progress } from 'semantic-ui-react';
import { Button } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import { usePopupInClosableContext } from '../../../../hooks';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import EditStep from './EditStep';

import styles from './Item.module.scss';
import taskListStyles from '../../../task-lists/TaskList/TaskList.module.scss';

const Item = React.memo(
  React.forwardRef(({ id, handleProps, isDragging, onKeyboardMove }, ref) => {
    const [t] = useTranslation();
    const selectTaskListById = useMemo(() => selectors.makeSelectTaskListById(), []);
    const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);

    const taskList = useSelector((state) => selectTaskListById(state, id));
    const tasks = useSelector((state) => selectTasksByTaskListId(state, id));
    const canEdit = useSelector((state) => {
      const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
      return !!boardMembership && boardMembership.role === BoardMembershipRoles.EDITOR;
    });
    const leafTasks = useMemo(
      () => tasks.filter((task) => !tasks.some((childTask) => childTask.parentTaskId === task.id)),
      [tasks],
    );
    const completedTasksTotal = useMemo(
      () => leafTasks.reduce((result, task) => (task.isCompleted ? result + 1 : result), 0),
      [leafTasks],
    );

    const EditPopup = usePopupInClosableContext(EditStep);
    const canDrag = taskList.isPersisted && canEdit && handleProps;
    const handleDragKeyDown = useCallback(
      (event) => {
        if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          onKeyboardMove(id, event.key === 'ArrowUp' ? 'up' : 'down');
          return;
        }

        handleProps?.onKeyDown?.(event);
      },
      [handleProps, id, onKeyboardMove],
    );

    return (
      <div
        ref={ref}
        className={classNames(
          isDragging && 'card-modal-theme',
          styles.wrapper,
          isDragging && styles.wrapperDragging,
        )}
      >
        <div className={styles.moduleWrapper}>
          {canDrag ? (
            <button
              type="button"
              aria-label={t('common.dragTaskList')}
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              title={t('common.dragTaskListKeyboardHint')}
              className={styles.moduleDragHandle}
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...handleProps}
              onKeyDown={handleDragKeyDown}
            >
              <Icon fitted name="check square outline" />
            </button>
          ) : (
            <Icon name="check square outline" className={styles.moduleIcon} />
          )}
          <div className={classNames(styles.moduleHeader, canEdit && styles.moduleHeaderEditable)}>
            {taskList.isPersisted && canEdit && (
              <EditPopup taskListId={taskList.id}>
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={t('action.edit')}
                  isIconOnly
                  title={t('action.edit')}
                  className={styles.editButton}
                >
                  <Icon fitted name="pencil" size="small" />
                </Button>
              </EditPopup>
            )}
            <span className={styles.moduleHeaderTitle}>{taskList.name}</span>
          </div>
          {tasks.length > 0 && (
            <div className={taskListStyles.progressRow}>
              <span className={taskListStyles.progressWrapper}>
                <Progress
                  value={completedTasksTotal}
                  total={leafTasks.length}
                  color="blue"
                  size="tiny"
                  aria-label={`${taskList.name}: ${completedTasksTotal}/${leafTasks.length}`}
                  aria-valuemin={0}
                  aria-valuemax={leafTasks.length}
                  aria-valuenow={completedTasksTotal}
                  className={taskListStyles.progress}
                />
              </span>
              <span className={taskListStyles.count} aria-hidden="true">
                {completedTasksTotal}/{leafTasks.length}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }),
);

Item.propTypes = {
  id: PropTypes.string.isRequired,
  handleProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  isDragging: PropTypes.bool.isRequired,
  onKeyboardMove: PropTypes.func.isRequired,
};

Item.defaultProps = {
  handleProps: undefined,
};

export default Item;
