/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Checkbox, Form, Radio, Tab } from 'semantic-ui-react';
import { Button } from '../../../../lib/custom-ui';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import EditInformation from './EditInformation';
import ConfirmationStep from '../../../common/ConfirmationStep';
import { useGantt } from '../../../gantt';
import { usePresentation } from '../../../presentation';

import styles from './GeneralPane.module.scss';

const GeneralPane = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);

  const hasBoards = useSelector(
    (state) => selectors.selectBoardIdsForCurrentProject(state).length > 0,
  );

  const canEdit = useSelector(selectors.selectIsCurrentUserManagerForCurrentProject);
  const canManageChat = useSelector(selectors.selectCanCurrentUserManageCurrentProjectChat);
  const canManageGantt = canManageChat;
  const canManagePresentation = canManageChat;
  const {
    plan: ganttPlan,
    isLoading: isGanttLoading,
    error: ganttError,
    activate: activateGantt,
    disable: disableGantt,
    reload: reloadGantt,
  } = useGantt();
  const [isGanttSubmitting, setIsGanttSubmitting] = useState(false);
  const {
    presentation,
    isLoading: isPresentationLoading,
    error: presentationError,
    activate: activatePresentation,
    disable: disablePresentation,
    reload: reloadPresentation,
  } = usePresentation();
  const [isPresentationSubmitting, setIsPresentationSubmitting] = useState(false);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleToggleChange = useCallback(
    (_, { name: fieldName, checked }) => {
      dispatch(
        entryActions.updateCurrentProject({
          [fieldName]: checked,
        }),
      );
    },
    [dispatch],
  );

  const handleChatModeChange = useCallback(
    (_, { value }) => {
      dispatch(
        entryActions.updateCurrentProject({
          chatMode: value,
        }),
      );
    },
    [dispatch],
  );

  const handleGanttToggleChange = useCallback(
    async (_, { checked }) => {
      const isEnabled = Boolean(ganttPlan?.isEnabled);
      if (checked === isEnabled) {
        return;
      }

      setIsGanttSubmitting(true);
      try {
        if (checked) {
          await activateGantt();
          toast.success(t('common.ganttActivated'));
        } else {
          await disableGantt();
          toast.success(t('common.ganttDeactivated'));
        }
      } catch {
        toast.error(t('common.ganttSaveFailed'));
      } finally {
        setIsGanttSubmitting(false);
      }
    },
    [activateGantt, disableGantt, ganttPlan?.isEnabled, t],
  );

  const handlePresentationToggleChange = useCallback(
    async (_, { checked }) => {
      const isEnabled = Boolean(presentation?.isEnabled);
      if (checked === isEnabled) {
        return;
      }

      setIsPresentationSubmitting(true);
      try {
        if (checked) {
          await activatePresentation();
          toast.success(t('common.presentationActivated'));
        } else {
          await disablePresentation();
          toast.success(t('common.presentationDeactivated'));
        }
      } catch {
        toast.error(t('common.presentationSaveFailed'));
      } finally {
        setIsPresentationSubmitting(false);
      }
    },
    [activatePresentation, disablePresentation, presentation?.isEnabled, t],
  );

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteCurrentProject());
  }, [dispatch]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      {canEdit && (
        <section className={styles.section}>
          <EditInformation />
        </section>
      )}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t('common.display', {
            context: 'title',
          })}
        </h3>
        <div className={styles.settingRow}>
          <Radio
            toggle
            name="isHidden"
            checked={project.isHidden}
            label={t('common.hideFromProjectListAndFavorites')}
            className={styles.radio}
            onChange={handleToggleChange}
          />
        </div>
      </section>
      {canEdit && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t('common.cards', {
              context: 'title',
            })}
          </h3>
          <div className={styles.settingRow}>
            <Radio
              toggle
              name="autoAddBoardMembersToCards"
              checked={project.autoAddBoardMembersToCards}
              label={t('common.autoAddBoardMembersToCards')}
              className={styles.radio}
              onChange={handleToggleChange}
            />
          </div>
          <p className={styles.hint}>{t('common.autoAddBoardMembersToCardsHint')}</p>
        </section>
      )}
      {canManageGantt && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('common.projectChat')}</h3>
          <div className={styles.accessField}>
            <Form.Select
              fluid
              upward
              label={t('common.projectChatAccess')}
              value={project.chatMode || 'allProjectMembers'}
              options={[
                {
                  key: 'disabled',
                  value: 'disabled',
                  text: t('common.projectChatDisabled'),
                },
                {
                  key: 'managers',
                  value: 'managers',
                  text: t('common.projectChatManagersOnly'),
                },
                {
                  key: 'allProjectMembers',
                  value: 'allProjectMembers',
                  text: t('common.projectChatAllMembers'),
                },
              ]}
              onChange={handleChatModeChange}
            />
          </div>
          <p className={styles.hint}>{t('common.projectChatAccessHint')}</p>
        </section>
      )}
      {canManageChat && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('common.gantt')}</h3>
          <div className={styles.settingRow}>
            <Checkbox
              toggle
              label={t('common.ganttAvailability')}
              checked={Boolean(ganttPlan?.isEnabled)}
              className={styles.radio}
              disabled={isGanttLoading || isGanttSubmitting || Boolean(ganttError)}
              onChange={handleGanttToggleChange}
            />
          </div>
          <p className={styles.hint} role={ganttError ? 'alert' : undefined}>
            {ganttError ? t('common.ganttLoadFailed') : t('common.ganttAvailabilityHint')}
          </p>
          {ganttError && (
            <Button variant="secondary" className={styles.retryButton} onClick={reloadGantt}>
              {t('action.retry')}
            </Button>
          )}
        </section>
      )}
      {canManagePresentation && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('common.presentation')}</h3>
          <div className={styles.settingRow}>
            <Checkbox
              toggle
              label={t('common.presentationAvailability')}
              checked={Boolean(presentation?.isEnabled)}
              className={styles.radio}
              disabled={
                isPresentationLoading || isPresentationSubmitting || Boolean(presentationError)
              }
              onChange={handlePresentationToggleChange}
            />
          </div>
          <p className={styles.hint} role={presentationError ? 'alert' : undefined}>
            {presentationError
              ? t('common.presentationLoadFailed')
              : t('common.presentationAvailabilityHint')}
          </p>
          {presentationError && (
            <Button variant="secondary" className={styles.retryButton} onClick={reloadPresentation}>
              {t('action.retry')}
            </Button>
          )}
        </section>
      )}
      {canEdit && (
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h3 className={styles.sectionTitle}>
            {t('common.dangerZone', {
              context: 'title',
            })}
          </h3>
          <div className={styles.action}>
            <ConfirmationPopup
              title="common.deleteProject"
              content="common.areYouSureYouWantToDeleteThisProject"
              buttonContent="action.deleteProject"
              onConfirm={handleDeleteConfirm}
            >
              <Button variant="secondary" disabled={hasBoards} className={styles.actionButton}>
                {t('action.deleteProject', {
                  context: 'title',
                })}
              </Button>
            </ConfirmationPopup>
          </div>
          {hasBoards && (
            <p className={styles.dangerHint}>
              {t('common.deleteAllBoardsToBeAbleToDeleteThisProject')}
            </p>
          )}
        </section>
      )}
    </Tab.Pane>
  );
});

export default GeneralPane;
