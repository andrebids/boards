import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { AtSign, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatTextWithMentions } from '../../../utils/mentions';
import ChatAvatar from '../ChatAvatar';
import ConversationActions from '../ConversationActions';
import useChatParticipantMuteState from '../useChatParticipantMuteState';
import {
  hasUnreadMessages,
  isChatParticipantMentionsOnly,
  isCustomGroupConversation,
} from '../utils';

import styles from './ConversationRow.module.scss';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    : new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
      }).format(date);
};

const getPreview = (lastMessage, sender, isGeneral, isBlocked, t) => {
  if (!lastMessage) {
    if (isGeneral) return t('chat.allAuthorizedMembers');
    return isBlocked ? t('chat.unavailable') : t('chat.startConversation');
  }

  if (lastMessage.deletedAt) return t('chat.messageDeleted');
  const text =
    lastMessage.attachments?.length > 0 && !lastMessage.text
      ? t('chat.sentFile')
      : formatTextWithMentions(lastMessage.text || '');
  return isGeneral && sender
    ? `${sender.name}: ${text}`
    : text || t('chat.sentFile');
};

const ConversationRow = React.memo(
  ({
    conversation,
    currentParticipant,
    isGeneral,
    isOpen,
    isPending,
    lastMessage,
    onClick,
    sender,
    user,
  }) => {
    const [t] = useTranslation();
    const title = useMemo(
      () =>
        isGeneral
          ? t('chat.general')
          : user?.name ||
            conversation?.title ||
            conversation?.name ||
            t('chat.conversation'),
      [conversation?.name, conversation?.title, isGeneral, t, user?.name],
    );
    const id = conversation?.id;
    const unreadCount = conversation?.unreadCount || 0;
    const hasUnread = hasUnreadMessages(conversation);
    const isMuted = useChatParticipantMuteState(currentParticipant);
    const isMentionsOnly = isChatParticipantMentionsOnly(currentParticipant);
    const notificationStateLabel = isMuted
      ? t('chat.notificationsMuted')
      : t('chat.notifyMentions');

    const rowClassName = [
      styles.row,
      hasUnread ? styles.hasUnread : '',
      isOpen ? styles.isOpen : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rowClassName}>
        <button
          type="button"
          data-id={id}
          className={styles.primary}
          disabled={isPending}
          onClick={(event) =>
            id ? onClick(event.currentTarget.dataset.id) : onClick()
          }
        >
          <ChatAvatar
            isOnline={user?.isOnline}
            isProject={isGeneral || isCustomGroupConversation(conversation)}
            user={user}
          />
          <span className={styles.copy}>
            <span className={styles.titleLine}>
              <strong>{title}</strong>
              {(isMuted || isMentionsOnly) && (
                <span
                  className={styles.notificationIndicator}
                  role="img"
                  aria-label={notificationStateLabel}
                  title={notificationStateLabel}
                >
                  {isMuted ? (
                    <BellOff aria-hidden="true" size={13} strokeWidth={2.2} />
                  ) : (
                    <AtSign aria-hidden="true" size={13} strokeWidth={2.2} />
                  )}
                </span>
              )}
            </span>
            <small>
              {getPreview(
                lastMessage,
                sender,
                isGeneral,
                conversation?.isBlocked,
                t,
              )}
            </small>
          </span>
          <span className={styles.meta}>
            <time>
              {formatTime(
                lastMessage?.createdAt || conversation?.lastMessageAt,
              )}
            </time>
            {hasUnread && (
              <span
                className={styles.unread}
                aria-label={t('chat.unreadMessages', { count: unreadCount })}
              >
                {Math.min(unreadCount, 99)}
              </span>
            )}
          </span>
        </button>
        {id && (
          <ConversationActions
            conversationId={id}
            isMuted={isMuted}
            participant={currentParticipant}
          />
        )}
      </div>
    );
  },
);

ConversationRow.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isBlocked: PropTypes.bool,
    name: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string.isRequired,
    unreadCount: PropTypes.number,
    lastMessageAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
  }),
  currentParticipant: PropTypes.shape({
    isMuted: PropTypes.bool,
    mutedUntil: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    notificationLevel: PropTypes.string,
  }),
  isGeneral: PropTypes.bool,
  isOpen: PropTypes.bool,
  isPending: PropTypes.bool,
  lastMessage: PropTypes.shape({
    text: PropTypes.string,
    deletedAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    attachments: PropTypes.arrayOf(
      PropTypes.shape({ id: PropTypes.string.isRequired }),
    ),
  }),
  onClick: PropTypes.func.isRequired,
  sender: PropTypes.shape({ name: PropTypes.string.isRequired }),
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    isOnline: PropTypes.bool,
  }),
};

ConversationRow.defaultProps = {
  conversation: undefined,
  currentParticipant: undefined,
  isGeneral: false,
  isOpen: false,
  isPending: false,
  lastMessage: undefined,
  sender: undefined,
  user: undefined,
};

export default ConversationRow;
