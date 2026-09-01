/*! Copyright (c) 2024 PLANKA Software GmbH */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useDidUpdate } from '../../../../lib/hooks';

import selectors from '../../../../selectors';
import { isListArchiveOrTrash } from '../../../../utils/record-helpers';
import { BoardMembershipRoles } from '../../../../constants/Enums';
import { ClosableContext } from '../../../../contexts';
import AddTask from '../../../task-lists/TaskList/AddTask';

import taskListStyles from '../../../task-lists/TaskList/TaskList.module.scss';

const TaskListFooter = React.memo(({ taskListId }) => {
  const [t] = useTranslation();
  const selectTaskListById = useMemo(() => selectors.makeSelectTaskListById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectTasksByTaskListId = useMemo(() => selectors.makeSelectTasksByTaskListId(), []);
  const taskList = useSelector((state) => selectTaskListById(state, taskListId));
  const tasks = useSelector((state) => selectTasksByTaskListId(state, taskListId));
  const canEdit = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    return (
      !isListArchiveOrTrash(list) &&
      !!boardMembership &&
      boardMembership.role === BoardMembershipRoles.EDITOR
    );
  });
  const [isAddOpened, setIsAddOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);

  const handleAddClick = useCallback(() => {
    setIsAddOpened(true);
  }, []);

  const handleAddClose = useCallback(() => {
    setIsAddOpened(false);
  }, []);

  useDidUpdate(() => {
    setIsClosableActive(isAddOpened);
  }, [isAddOpened]);

  if (!canEdit) {
    return null;
  }

  return (
    <AddTask taskListId={taskListId} isOpened={isAddOpened} onClose={handleAddClose}>
      <button
        type="button"
        disabled={!taskList.isPersisted}
        className={taskListStyles.taskButton}
        onClick={handleAddClick}
      >
        <Icon fitted name="add" size="small" />
        <span className={taskListStyles.taskButtonText}>
          {tasks.length > 0 ? t('action.addAnotherTask') : t('action.addTask')}
        </span>
      </button>
    </AddTask>
  );
});

TaskListFooter.propTypes = {
  taskListId: PropTypes.string.isRequired,
};

export default TaskListFooter;
