import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import ChatAvatar from '../../chat/ChatAvatar';
import { getMessagePreviewText } from '../../chat/ChatLauncher/preview';

import styles from './ChatNotificationItem.module.scss';

const formatTime = (value, language) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const isToday = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    language,
    isToday ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' },
  ).format(date);
};

const ChatNotificationItem = React.memo(({ item, onOpen }) => {
  const { t, i18n } = useTranslation();
  const sender = useSelector((state) =>
    item.lastMessage?.userId ? selectors.selectUserById(state, item.lastMessage.userId) : undefined,
  );
  const conversationUser = useSelector((state) =>
    item.avatarUserId ? selectors.selectUserById(state, item.avatarUserId) : undefined,
  );
  const title =
    item.title || (item.type === 'projectGroup' ? t('chat.general') : t('chat.conversation'));
  const senderName = sender?.name || title;
  const avatarUser = useMemo(
    () => sender || conversationUser || { name: senderName },
    [conversationUser, sender, senderName],
  );
  const context = [title !== senderName ? title : null, item.projectName]
    .filter(Boolean)
    .join(' · ');
  const messageTime = item.lastMessage?.createdAt || item.lastMessageAt;
  const preview = getMessagePreviewText(item.lastMessage, t);

  return (
    <button
      type="button"
      className={styles.item}
      aria-label={t('chat.openGlobalConversation', {
        conversation: title,
        project: item.projectName,
      })}
      onClick={() => onOpen(item)}
    >
      <ChatAvatar user={avatarUser} />
      <span className={styles.copy}>
        <span className={styles.heading}>
          <strong>{senderName}</strong>
          <time dateTime={messageTime || undefined}>{formatTime(messageTime, i18n.language)}</time>
        </span>
        {context && <span className={styles.context}>{context}</span>}
        <span className={styles.preview}>{preview}</span>
      </span>
      <span
        className={styles.unread}
        aria-label={t('chat.unreadMessages', { count: item.unreadCount })}
      >
        {item.unreadCount > 99 ? '99+' : item.unreadCount}
      </span>
    </button>
  );
});

ChatNotificationItem.propTypes = {
  item: PropTypes.shape({
    avatarUserId: PropTypes.string,
    conversationId: PropTypes.string.isRequired,
    firstUnreadMessageId: PropTypes.string,
    lastMessage: PropTypes.shape({
      attachments: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })),
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      deletedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      text: PropTypes.string,
      userId: PropTypes.string,
    }),
    lastMessageAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    projectId: PropTypes.string.isRequired,
    projectName: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string,
    unreadCount: PropTypes.number.isRequired,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ChatNotificationItem;
