/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { CheckCheck } from 'lucide-react';

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
  const readNotificationIds = useSelector((state) =>
    projectId ? [] : selectors.selectReadNotificationIdsForCurrentUser(state),
  );
  const notificationHistory = useSelector(selectors.selectNotificationHistoryState);
  const unreadChatConversationTotal =
    useSelector(selectors.selectChatInboxUnreadConversationTotal) || 0;
  const chatNotificationItems = useSelector(selectors.selectChatInboxNotificationItems);
  const hasUnreadChatConversations = !projectId && unreadChatConversationTotal > 0;
  const hasUnreadContent = notificationIds.length > 0 || hasUnreadChatConversations;
  const hasHistoryContent = !projectId && readNotificationIds.length > 0;
  const hasContent = hasUnreadContent || hasHistoryContent;
  const isHistoryPendingOrFailed =
    !projectId && (notificationHistory.isFetching || notificationHistory.error);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const { openConversationList, openGlobalConversation, setInboxScope } = useChat();

  useEffect(() => {
    if (
      !projectId &&
      !notificationHistory.isLoaded &&
      !notificationHistory.isFetching &&
      !notificationHistory.error
    ) {
      dispatch(entryActions.fetchNotificationHistory());
    }
  }, [
    dispatch,
    projectId,
    notificationHistory.error,
    notificationHistory.isFetching,
    notificationHistory.isLoaded,
  ]);

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

  const handleLoadMoreClick = useCallback(() => {
    const lastNotificationId = readNotificationIds[readNotificationIds.length - 1];

    if (lastNotificationId) {
      dispatch(entryActions.fetchNotificationHistory(lastNotificationId));
    }
  }, [dispatch, readNotificationIds]);

  const handleRetryHistoryClick = useCallback(() => {
    dispatch(entryActions.fetchNotificationHistory());
  }, [dispatch]);

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
          {!projectId && notificationIds.length > 0 && (
            <button
              type="button"
              className={styles.headerAction}
              aria-label={t('common.markAllNotificationsAsRead')}
              title={t('common.markAllNotificationsAsRead')}
              onClick={handleDeleteAllClick}
            >
              <CheckCheck aria-hidden="true" size={16} strokeWidth={2.25} />
            </button>
          )}
        </div>
        {hasContent && (
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
            {!projectId &&
              (hasHistoryContent ||
                notificationHistory.isFetching ||
                notificationHistory.error) && (
                <section
                  className={styles.historySection}
                  aria-labelledby="notification-history-title"
                >
                  <div className={styles.sectionTitle} id="notification-history-title">
                    {t('common.earlierNotifications')}
                  </div>
                  {readNotificationIds.map((notificationId) => (
                    <Item key={notificationId} id={notificationId} onClose={onClose} />
                  ))}
                  {notificationHistory.isFetching && (
                    <div className={styles.historyStatus} role="status">
                      {t('common.loading')}
                    </div>
                  )}
                  {notificationHistory.error && (
                    <div className={styles.historyStatus} role="alert">
                      <span>{t('common.notificationHistoryLoadFailed')}</span>
                      <button
                        type="button"
                        className={styles.retryButton}
                        onClick={handleRetryHistoryClick}
                      >
                        {t('action.retry')}
                      </button>
                    </div>
                  )}
                  {!notificationHistory.isFetching &&
                    !notificationHistory.error &&
                    notificationHistory.hasMore && (
                      <button
                        type="button"
                        className={styles.loadMoreButton}
                        onClick={handleLoadMoreClick}
                      >
                        {t('common.showMore')}
                      </button>
                    )}
                </section>
              )}
          </div>
        )}
        {!hasContent && !projectId && notificationHistory.isFetching && (
          <div className={styles.emptyState} role="status">
            {t('common.loading')}
          </div>
        )}
        {!hasContent && !projectId && notificationHistory.error && (
          <div className={styles.emptyState} role="alert">
            <span>{t('common.notificationHistoryLoadFailed')}</span>
            <button type="button" className={styles.retryButton} onClick={handleRetryHistoryClick}>
              {t('action.retry')}
            </button>
          </div>
        )}
        {!hasContent && !isHistoryPendingOrFailed && (
          <div className={styles.emptyState}>
            {t(projectId ? 'common.noUnreadProjectNotifications' : 'common.noUnreadNotifications')}
          </div>
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
