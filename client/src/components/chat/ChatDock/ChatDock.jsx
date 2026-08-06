import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { useChat } from '../ChatContext';
import { getOverflowChatWindowIds } from '../ChatContext/windowState';
import ChatAvatar from '../ChatAvatar';
import ChatWindow from '../ChatWindow';
import {
  getConversationTitle,
  getDirectUser,
  isCustomGroupConversation,
  isGeneralConversation,
  shouldConcealChatDock,
} from '../utils';

import styles from './ChatDock.module.scss';

const getLimit = (width) => {
  if (width >= 1024) {
    return 2;
  }

  return 1;
};

const ChatDock = React.memo(() => {
  const [t] = useTranslation();
  const {
    isConversationListClosing,
    isConversationListOpen,
    isEnabled,
    minimizeConversation,
    openConversation,
    windows,
  } = useChat();
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const conversations = useSelector(selectors.selectChatConversationsForCurrentProject) || [];
  const members = useSelector(selectors.selectChatMembersForCurrentProject) || [];
  const [limit, setLimit] = useState(() => getLimit(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setLimit(getLimit(window.innerWidth));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const overflowWindowIds = useMemo(
    () => getOverflowChatWindowIds(windows, limit),
    [limit, windows],
  );
  const overflowWindowIdSet = useMemo(() => new Set(overflowWindowIds), [overflowWindowIds]);

  useEffect(() => {
    overflowWindowIds.forEach(minimizeConversation);
  }, [minimizeConversation, overflowWindowIds]);

  const visibleWindows = useMemo(
    () => windows.filter((window) => !window.isMinimized && !overflowWindowIdSet.has(window.id)),
    [overflowWindowIdSet, windows],
  );

  const bubbleWindows = useMemo(() => {
    return windows.filter((window) => window.isMinimized || overflowWindowIdSet.has(window.id));
  }, [overflowWindowIdSet, windows]);

  if (!isEnabled || windows.length === 0) {
    return null;
  }

  const isConcealed = shouldConcealChatDock(isConversationListOpen, isConversationListClosing);

  return (
    <aside
      className={`${styles.dock} ${isConcealed ? styles.concealed : ''}`}
      aria-hidden={isConcealed}
      aria-label={t('chat.openConversations')}
    >
      {bubbleWindows.length > 0 && (
        <div className={styles.bubbleRail} aria-label={t('chat.openConversations')}>
          {bubbleWindows.map((window) => {
            const conversation = conversations.find((item) => item.id === window.id);
            if (!conversation) {
              return null;
            }

            const directUser = getDirectUser(conversation, members, currentUser.id);
            const isProjectConversation =
              isGeneralConversation(conversation) || isCustomGroupConversation(conversation);
            const title = getConversationTitle(
              conversation,
              members,
              currentUser.id,
              project?.name || '',
              {
                conversationTitle: t('chat.conversation'),
                generalTitle: t('chat.general'),
              },
            );
            const unreadCount = conversation.unreadCount || 0;
            const label = unreadCount
              ? `${title} — ${t('chat.unreadMessages', { count: unreadCount })}`
              : title;
            const bubbleClassName = `${styles.bubble} ${
              unreadCount > 0 ? styles.bubbleUnread : ''
            }`;

            return (
              <button
                type="button"
                key={window.id}
                className={bubbleClassName}
                aria-label={label}
                title={label}
                onClick={() => openConversation(window.id)}
              >
                <ChatAvatar
                  isOnline={directUser?.isOnline}
                  isProject={isProjectConversation}
                  user={directUser}
                />
                {unreadCount > 0 && (
                  <span className={styles.bubbleBadge}>{Math.min(unreadCount, 99)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className={styles.windows}>
        {visibleWindows.map((window) => (
          <ChatWindow key={window.id} id={window.id} />
        ))}
      </div>
    </aside>
  );
});

export default ChatDock;
