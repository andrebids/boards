/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Popup } from '../../../../lib/custom-ui';

import entryActions from '../../../../entry-actions';
import { useSteps } from '../../../../hooks';
import ConfirmationStep from '../../../common/ConfirmationStep';
import Paths from '../../../../constants/Paths';
import selectors from '../../../../selectors';
import { useGantt } from '../../../gantt';
import { getTaskDeleteConfirmation } from './ActionsStep.utils';

import styles from './ActionsStep.module.scss';

const StepTypes = {
  DELETE: 'DELETE',
};

const ActionsStep = React.memo((props) => {
  const { taskId, childTaskCount, canEditTask, onNameEdit, onClose } = props;
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [step, openStep, handleBack] = useSteps();
  const [isGanttSubmitting, setIsGanttSubmitting] = useState(false);
  const project = useSelector(selectors.selectCurrentProject);
  const isEditModeEnabled = useSelector(selectors.selectIsEditModeEnabled);
  const { plan, canEdit: canEditGantt, importSourceTasks, linkedItemsByTaskId } = useGantt();
  const navigate = useNavigate();
  const linkedItem = linkedItemsByTaskId[taskId];
  const canUseGantt = Boolean(plan?.isEnabled && canEditGantt && isEditModeEnabled);
  const deleteConfirmation = getTaskDeleteConfirmation(childTaskCount);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteTask(taskId));
  }, [taskId, dispatch]);

  const handleEditNameClick = useCallback(() => {
    onNameEdit();
    onClose();
  }, [onNameEdit, onClose]);

  const handleDeleteClick = useCallback(() => {
    openStep(StepTypes.DELETE);
  }, [openStep]);

  const handleGanttClick = useCallback(async () => {
    if (linkedItem) {
      onClose();
      navigate(`${Paths.GANTT.replace(':id', project.id)}?item=${linkedItem.id}`);
      return;
    }

    setIsGanttSubmitting(true);
    try {
      await importSourceTasks([taskId]);
      toast.success(t('common.ganttTaskAddedFromBoard'));
      onClose();
    } catch {
      toast.error(t('common.ganttTaskAddFailed'));
      setIsGanttSubmitting(false);
    }
  }, [importSourceTasks, linkedItem, navigate, onClose, project.id, t, taskId]);

  if (step && step.type === StepTypes.DELETE) {
    return (
      <ConfirmationStep
        title="common.deleteTask"
        content={deleteConfirmation.content}
        contentValues={deleteConfirmation.contentValues}
        buttonContent="action.deleteTask"
        onConfirm={handleDeleteConfirm}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <Popup.Header>
        {t('common.taskActions', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          {canEditTask && (
            <Menu.Item className={styles.menuItem} onClick={handleEditNameClick}>
              {t('action.editDescription', {
                context: 'title',
              })}
            </Menu.Item>
          )}
          {canUseGantt && (
            <Menu.Item
              className={styles.menuItem}
              disabled={isGanttSubmitting}
              onClick={handleGanttClick}
            >
              {linkedItem ? t('common.ganttOpenLinkedTask') : t('common.ganttAddToGantt')}
            </Menu.Item>
          )}
          {canEditTask && (
            <Menu.Item className={styles.menuItem} onClick={handleDeleteClick}>
              {t('action.deleteTask', {
                context: 'title',
              })}
            </Menu.Item>
          )}
        </Menu>
      </Popup.Content>
    </>
  );
});

ActionsStep.propTypes = {
  taskId: PropTypes.string.isRequired,
  childTaskCount: PropTypes.number.isRequired,
  canEditTask: PropTypes.bool.isRequired,
  onNameEdit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ActionsStep;
