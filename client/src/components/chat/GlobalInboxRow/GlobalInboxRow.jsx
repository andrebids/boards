import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { AtSign, BellOff, Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { formatTextWithMentions } from '../../../utils/mentions';
import ChatAvatar from '../ChatAvatar';

import styles from './GlobalInboxRow.module.scss';

const formatTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const isToday = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    undefined,
    isToday ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' },
  ).format(date);
};

const getPreview = (lastMessage, t) => {
  if (!lastMessage) return t('chat.startConversation');
  if (lastMessage.deletedAt) return t('chat.messageDeleted');
  if (lastMessage.attachments?.length > 0 && !lastMessage.text) return t('chat.sentFile');

  return formatTextWithMentions(lastMessage.text || '') || t('chat.sentFile');
};

const GlobalInboxRow = React.memo(({ item, onMarkAsRead, onOpen }) => {
  const [t] = useTranslation();
  const user = useSelector((state) =>
    item.avatarUserId ? selectors.selectUserById(state, item.avatarUserId) : undefined,
  );
  const title =
    item.title || (item.type === 'projectGroup' ? t('chat.general') : t('chat.conversation'));
  const avatarUser = useMemo(() => user || { name: title }, [title, user]);
  const unreadCount = item.unreadCount || 0;
  const hasUnread = unreadCount > 0;
  const hasChatAccess = item.hasChatAccess !== false;
  const preview = getPreview(item.lastMessage, t);
  const notificationLabel = item.isMuted ? t('chat.notificationsMuted') : t('chat.unreadMention');

  const className = [styles.row, hasUnread ? styles.hasUnread : ''].filter(Boolean).join(' ');

  const handleMarkAsRead = (event) => {
    event.stopPropagation();
    onMarkAsRead(item.conversationId);
  };

  return (
    <article className={className}>
      <button
        type="button"
        className={styles.primary}
        disabled={!hasChatAccess}
        aria-label={
          hasChatAccess
            ? t('chat.openGlobalConversation', {
                conversation: title,
                project: item.projectName,
              })
            : t('chat.conversationUnavailable')
        }
        onClick={() => onOpen(item)}
      >
        <ChatAvatar user={avatarUser} isProject={!item.avatarUserId} />
        <span className={styles.copy}>
          <span className={styles.titleLine}>
            <strong>{title}</strong>
            {(item.isMuted || item.hasUnreadMention) && (
              <span
                className={styles.notificationIndicator}
                role="img"
                aria-label={notificationLabel}
                title={notificationLabel}
              >
                {item.isMuted ? (
                  <BellOff aria-hidden="true" size={12} strokeWidth={2.2} />
                ) : (
                  <AtSign aria-hidden="true" size={12} strokeWidth={2.2} />
                )}
              </span>
            )}
          </span>
          <span className={styles.projectName}>{item.projectName || t('chat.project')}</span>
          <small>{hasChatAccess ? preview : t('chat.conversationUnavailable')}</small>
        </span>
        <span className={styles.meta}>
          <time dateTime={item.lastMessage?.createdAt || item.lastMessageAt || undefined}>
            {formatTime(item.lastMessage?.createdAt || item.lastMessageAt)}
          </time>
          {hasUnread && (
            <span
              className={styles.unread}
              aria-label={t('chat.unreadMessages', { count: unreadCount })}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
      </button>
      {hasUnread && hasChatAccess && (
        <button
          type="button"
          className={styles.readButton}
          aria-label={t('chat.markConversationAsRead', { conversation: title })}
          title={t('chat.markAsRead')}
          onClick={handleMarkAsRead}
        >
          <Check aria-hidden="true" size={15} strokeWidth={2.4} />
        </button>
      )}
    </article>
  );
});

GlobalInboxRow.propTypes = {
  item: PropTypes.shape({
    avatarUserId: PropTypes.string,
    conversationId: PropTypes.string.isRequired,
    firstUnreadMessageId: PropTypes.string,
    hasChatAccess: PropTypes.bool,
    hasUnreadMention: PropTypes.bool,
    isMuted: PropTypes.bool,
    lastMessage: PropTypes.shape({
      attachments: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })),
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      deletedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      text: PropTypes.string,
    }),
    lastMessageAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    projectId: PropTypes.string.isRequired,
    projectName: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string,
    unreadCount: PropTypes.number,
  }).isRequired,
  onMarkAsRead: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default GlobalInboxRow;
