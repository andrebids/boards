/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Form, Radio, Tab } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { usePopupInClosableContext } from '../../../../hooks';
import EditInformation from './EditInformation';
import ConfirmationStep from '../../../common/ConfirmationStep';

import styles from './GeneralPane.module.scss';

const GeneralPane = React.memo(() => {
  const project = useSelector(selectors.selectCurrentProject);

  const hasBoards = useSelector(
    (state) => selectors.selectBoardIdsForCurrentProject(state).length > 0,
  );

  const canEdit = useSelector(selectors.selectIsCurrentUserManagerForCurrentProject);
  const canManageChat = useSelector(selectors.selectCanCurrentUserManageCurrentProjectChat);

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
      {canManageChat && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('common.projectChat')}</h3>
          <div className={styles.chatModeField}>
            <Form.Select
              fluid
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
              <Button disabled={hasBoards} className={styles.actionButton}>
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
