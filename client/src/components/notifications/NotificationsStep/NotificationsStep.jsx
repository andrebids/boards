/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../../chat/ChatContext';
import ChatNotificationItem from '../ChatNotificationItem';
import Item from './Item';

import styles from './NotificationsStep.module.scss';

const NotificationsStep = React.memo(({ projectId, onClose }) => {
  const selectNotificationIdsByProjectId = useMemo(
    () => selectors.makeSelectNotificationIdsByProjectId(),
    [],
  );

  const notificationIds = useSelector((state) =>
    projectId
      ? selectNotificationIdsByProjectId(state, projectId)
      : selectors.selectNotificationIdsForCurrentUser(state),
  );
  const unreadChatConversationTotal =
    useSelector(selectors.selectChatInboxUnreadConversationTotal) || 0;
  const chatNotificationItems = useSelector(selectors.selectChatInboxNotificationItems);
  const hasUnreadChatConversations = !projectId && unreadChatConversationTotal > 0;
  const hasUnreadContent = notificationIds.length > 0 || hasUnreadChatConversations;

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const { openConversationList, openGlobalConversation, setInboxScope } = useChat();

  const handleDeleteAllClick = useCallback(() => {
    dispatch(entryActions.deleteAllNotifications());
  }, [dispatch]);

  const handleChatConversationOpen = useCallback(
    (item) => {
      onClose();
      openGlobalConversation(item);
    },
    [onClose, openGlobalConversation],
  );

  const handleAllChatConversationsOpen = useCallback(() => {
    setInboxScope('global');
    onClose();
    openConversationList();
  }, [onClose, openConversationList, setInboxScope]);

  return (
    <Popup.Content>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.title}>
            {projectId
              ? t('common.unreadProjectNotifications_title')
              : t('common.notifications', {
                  context: 'title',
                })}
          </div>
          {!projectId && notificationIds.length > 1 && (
            <button type="button" className={styles.headerAction} onClick={handleDeleteAllClick}>
              {t('action.dismissAll')}
            </button>
          )}
        </div>
        {hasUnreadContent ? (
          <div className={styles.items}>
            {hasUnreadChatConversations && (
              <section className={styles.chatSection} aria-labelledby="chat-notifications-title">
                <div className={styles.chatSectionHeader}>
                  <span id="chat-notifications-title">
                    <Icon fitted name="chat outline" aria-hidden="true" />
                    {t('chat.unreadChatMessagesTitle')}
                  </span>
                  {unreadChatConversationTotal > chatNotificationItems.length && (
                    <button type="button" onClick={handleAllChatConversationsOpen}>
                      {t('chat.viewAllConversations')}
                    </button>
                  )}
                </div>
                <div className={styles.chatItems}>
                  {chatNotificationItems.map((item) => (
                    <ChatNotificationItem
                      key={item.conversationId}
                      item={item}
                      onOpen={handleChatConversationOpen}
                    />
                  ))}
                </div>
              </section>
            )}
            {notificationIds.map((notificationId) => (
              <Item key={notificationId} id={notificationId} onClose={onClose} />
            ))}
          </div>
        ) : (
          t(projectId ? 'common.noUnreadProjectNotifications' : 'common.noUnreadNotifications')
        )}
      </div>
    </Popup.Content>
  );
});

NotificationsStep.propTypes = {
  projectId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

NotificationsStep.defaultProps = {
  projectId: undefined,
};

export default NotificationsStep;
