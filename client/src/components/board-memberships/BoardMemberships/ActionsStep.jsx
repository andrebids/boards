/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { Button, Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useSteps } from '../../../hooks';
import { useChat } from '../../chat/ChatContext';
import { getParticipantUserIds, isDirectConversation } from '../../chat/utils';
import SelectPermissionsStep from './SelectPermissionsStep';
import ConfirmationStep from '../../common/ConfirmationStep';
import UserAvatar from '../../users/UserAvatar';

import styles from './ActionsStep.module.scss';

const StepTypes = {
  EDIT_PERMISSIONS: 'EDIT_PERMISSIONS',
  DELETE: 'DELETE',
};

const ActionsStep = React.memo(
  ({ boardMembershipId, title, onBack, onClose }) => {
    const selectBoardMembershipById = useMemo(
      () => selectors.makeSelectBoardMembershipById(),
      []
    );
    const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

    const boardMembership = useSelector(state =>
      selectBoardMembershipById(state, boardMembershipId)
    );

    const user = useSelector(state =>
      selectUserById(state, boardMembership.userId)
    );

    const isCurrentUser = useSelector(
      state => boardMembership.userId === selectors.selectCurrentUserId(state)
    );

    const canEdit = useSelector(
      selectors.selectIsCurrentUserManagerForCurrentProject
    );

    const chatMembers = useSelector(
      selectors.selectChatMembersForCurrentProject
    );

    const dispatch = useDispatch();
    const {
      conversations,
      isPending,
      isProjectChatEnabled,
      openDirectConversation,
    } = useChat();

    const directConversation = conversations.find(
      conversation =>
        isDirectConversation(conversation) &&
        getParticipantUserIds(conversation).includes(boardMembership.userId)
    );

    const canStartChat =
      !isCurrentUser &&
      isProjectChatEnabled &&
      chatMembers.some(({ id }) => id === boardMembership.userId);

    const [t] = useTranslation();
    const [step, openStep, handleBack] = useSteps();

    const handleRoleSelect = useCallback(
      data => {
        dispatch(entryActions.updateBoardMembership(boardMembershipId, data));
      },
      [boardMembershipId, dispatch]
    );

    const handleDeleteConfirm = useCallback(() => {
      dispatch(entryActions.deleteBoardMembership(boardMembershipId));
      onClose();
    }, [boardMembershipId, onClose, dispatch]);

    const handleFilterClick = useCallback(() => {
      dispatch(
        entryActions.addUserToFilterInCurrentBoard(boardMembership.userId, true)
      );
      onClose();
    }, [onClose, boardMembership.userId, dispatch]);

    const handleChatClick = useCallback(() => {
      openDirectConversation(boardMembership.userId);
      onClose();
    }, [onClose, boardMembership.userId, openDirectConversation]);

    const handleEditPermissionsClick = useCallback(() => {
      openStep(StepTypes.EDIT_PERMISSIONS);
    }, [openStep]);

    const handleDeleteClick = useCallback(() => {
      openStep(StepTypes.DELETE);
    }, [openStep]);

    if (step) {
      switch (step.type) {
        case StepTypes.EDIT_PERMISSIONS:
          return (
            <SelectPermissionsStep
              boardMembership={boardMembership}
              title="common.editPermissions"
              buttonContent="action.save"
              onSelect={handleRoleSelect}
              onBack={handleBack}
              onClose={onClose}
            />
          );
        case StepTypes.DELETE:
          return (
            <ConfirmationStep
              title={
                isCurrentUser ? `common.leaveBoard` : 'common.removeMember'
              }
              content={
                isCurrentUser
                  ? `common.areYouSureYouWantToLeaveBoard`
                  : `common.areYouSureYouWantToRemoveThisMemberFromBoard`
              }
              buttonContent={
                isCurrentUser ? `action.leaveBoard` : 'action.removeMember'
              }
              onConfirm={handleDeleteConfirm}
              onBack={handleBack}
            />
          );
        default:
      }

      openStep(null);
    }

    const contentNode = (
      <>
        <div className={styles.userWrapper}>
          <span className={styles.user}>
            <UserAvatar id={boardMembership.userId} size="large" />
          </span>
          <span className={styles.content}>
            <div className={styles.name}>{user.name}</div>
            {user.username && (
              <div className={styles.username}>@{user.username}</div>
            )}
          </span>
        </div>
        {user.phone && (
          <div className={styles.information}>
            <Icon name="phone" className={styles.informationIcon} />
            {user.phone}
          </div>
        )}
        {user.organization && (
          <div className={styles.information}>
            <Icon name="briefcase" className={styles.informationIcon} />
            {user.organization}
          </div>
        )}
        {canStartChat && (
          <Button
            variant="outline"
            content={t(
              directConversation ? 'chat.openConversation' : 'chat.startConversation'
            )}
            icon="comments"
            size="tiny"
            className={styles.filterButton}
            disabled={isPending}
            onClick={handleChatClick}
          />
        )}
        <Button
          variant="outline"
          content={t('action.showCardsWithThisUser')}
          icon="filter"
          size="tiny"
          className={styles.filterButton}
          onClick={handleFilterClick}
        />
        {(isCurrentUser || canEdit) && (
          <>
            <hr className={styles.divider} />
            {canEdit && (
              <Button variant="secondary"
                fluid
                content={t('action.editPermissions')}
                className={styles.button}
                onClick={handleEditPermissionsClick}
              />
            )}
            {isCurrentUser ? (
              <Button variant="secondary"
                fluid
                content={t(`action.leaveBoard`)}
                className={styles.button}
                onClick={handleDeleteClick}
              />
            ) : (
              <Button variant="secondary"
                fluid
                content={t(`action.removeFromBoard`)}
                className={styles.button}
                onClick={handleDeleteClick}
              />
            )}
          </>
        )}
      </>
    );

    return onBack ? (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>{contentNode}</Popup.Content>
      </>
    ) : (
      contentNode
    );
  }
);

ActionsStep.propTypes = {
  boardMembershipId: PropTypes.string.isRequired,
  title: PropTypes.string,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

ActionsStep.defaultProps = {
  title: 'common.memberActions',
  onBack: undefined,
};

export default ActionsStep;
