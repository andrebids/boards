import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Bell, BellOff, LogOut, UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../ChatContext';
import ChatAvatar from '../ChatAvatar';
import MessageComposer from '../MessageComposer';
import MessageList from '../MessageList';
import {
  getConversationTitle,
  getDirectUser,
  isCustomGroupConversation,
  isGeneralConversation,
} from '../utils';

import styles from './ChatWindow.module.scss';

const ChatWindow = React.memo(({ id }) => {
  const [t] = useTranslation();
  const selectConversationById = useMemo(() => selectors.makeSelectChatConversationById(), []);
  const selectMessagesByConversationId = useMemo(
    () => selectors.makeSelectChatMessagesByConversationId(),
    [],
  );
  const selectIsMessagesFetchingByConversationId = useMemo(
    () => selectors.makeSelectIsChatMessagesFetchingByConversationId(),
    [],
  );
  const selectHasMoreMessagesByConversationId = useMemo(
    () => selectors.makeSelectHasMoreChatMessagesByConversationId(),
    [],
  );
  const selectHasMoreNewerMessagesByConversationId = useMemo(
    () => selectors.makeSelectHasMoreNewerChatMessagesByConversationId(),
    [],
  );
  const selectTypingUserIdsByConversationId = useMemo(
    () => selectors.makeSelectChatTypingUserIdsByConversationId(),
    [],
  );

  const conversation = useSelector((state) => selectConversationById(state, id));
  const messages = useSelector((state) => selectMessagesByConversationId(state, id)) || [];
  const isMessagesFetching = useSelector((state) =>
    selectIsMessagesFetchingByConversationId(state, id),
  );
  const hasMoreMessages = useSelector((state) => selectHasMoreMessagesByConversationId(state, id));
  const hasMoreNewerMessages = useSelector((state) =>
    selectHasMoreNewerMessagesByConversationId(state, id),
  );
  const currentUser = useSelector(selectors.selectCurrentUser);
  const project = useSelector(selectors.selectCurrentProject);
  const members = useSelector(selectors.selectChatMembersForCurrentProject) || [];
  const conversations = useSelector(selectors.selectChatConversationsForCurrentProject) || [];
  const typingUserIds = useSelector((state) => selectTypingUserIdsByConversationId(state, id));

  const dispatch = useDispatch();
  const { closeConversation, openConversationList, toggleConversationMinimized } = useChat();
  const fetchedConversationIdRef = useRef(null);
  const initialReadStateRef = useRef(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');

  useEffect(() => {
    if (!conversation) {
      fetchedConversationIdRef.current = null;
    }
  }, [conversation]);

  useEffect(() => {
    const deepLinkedMessageId = new URLSearchParams(window.location.search).get('chatMessage');
    const fetchKey = `${id}:${deepLinkedMessageId || ''}`;
    if (!conversation || fetchedConversationIdRef.current === fetchKey) {
      return;
    }

    fetchedConversationIdRef.current = fetchKey;
    dispatch(
      entryActions.fetchChatMessages(
        id,
        deepLinkedMessageId ? { aroundId: deepLinkedMessageId, replace: true } : undefined,
      ),
    );
  }, [conversation, dispatch, id]);

  useEffect(() => {
    const markAsReadIfVisible = () => {
      if (
        !conversation ||
        !conversation.unreadCount ||
        document.visibilityState !== 'visible' ||
        !document.hasFocus()
      ) {
        return;
      }

      dispatch(entryActions.markChatConversationAsRead(id));
    };

    markAsReadIfVisible();
    window.addEventListener('focus', markAsReadIfVisible);
    document.addEventListener('visibilitychange', markAsReadIfVisible);

    return () => {
      window.removeEventListener('focus', markAsReadIfVisible);
      document.removeEventListener('visibilitychange', markAsReadIfVisible);
    };
  }, [conversation, dispatch, id]);

  const handleBackClick = useCallback(() => {
    toggleConversationMinimized(id);
    openConversationList();
  }, [id, openConversationList, toggleConversationMinimized]);

  const handleCloseClick = useCallback(() => {
    closeConversation(id);
  }, [closeConversation, id]);

  if (!conversation) {
    return null;
  }

  const currentParticipant = conversation.participants?.find(
    ({ userId }) => userId === currentUser.id,
  );
  const otherParticipant = conversation.participants?.find(
    ({ userId }) => userId !== currentUser.id,
  );
  if (initialReadStateRef.current?.conversationId !== id) {
    initialReadStateRef.current = {
      conversationId: id,
      lastReadMessageId: currentParticipant?.lastReadMessageId,
      unreadCount: conversation.unreadCount || 0,
    };
  }

  const directUser = getDirectUser(conversation, members, currentUser.id);
  const title = getConversationTitle(conversation, members, currentUser.id, project.name, {
    conversationTitle: t('chat.conversation'),
    generalTitle: t('chat.general'),
  });

  let statusText = t('chat.project');
  if (conversation.isBlocked) {
    statusText = t('chat.conversationUnavailable');
  } else if (directUser?.isOnline) {
    statusText = t('chat.available');
  } else if (isCustomGroupConversation(conversation)) {
    statusText = t('chat.groupMemberCount', {
      count: conversation.participants?.length || 0,
    });
  }

  const isCustomGroup = isCustomGroupConversation(conversation);
  const isMuted = Boolean(currentParticipant?.isMuted);
  const isGroupOwner = currentParticipant?.role === 'owner';
  const participantUserIds = new Set(conversation.participantUserIds || []);

  const updatePreferences = (notificationLevel, mutedUntil = null) => {
    dispatch(entryActions.updateChatConversationPreferences(id, { notificationLevel, mutedUntil }));
    setIsOptionsOpen(false);
  };

  const muteUntilEndOfDay = () => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    updatePreferences(currentParticipant?.notificationLevel || 'all', date.toISOString());
  };

  const handleGroupTitleSave = () => {
    const titleValue = groupTitle.trim();
    if (titleValue && titleValue !== conversation.title) {
      dispatch(entryActions.updateChatConversation(id, { title: titleValue }));
    }
  };

  return (
    <section aria-label={title} className={styles.window}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          aria-label={t('chat.backToConversations')}
          title={t('chat.backToConversations')}
          onClick={handleBackClick}
        >
          <ArrowLeft aria-hidden="true" size={19} strokeWidth={2} />
        </button>
        <div className={styles.headerMain}>
          <ChatAvatar
            isOnline={directUser?.isOnline}
            isProject={isGeneralConversation(conversation) || isCustomGroup}
            user={directUser}
          />
          <span className={styles.headingCopy}>
            <strong>{title}</strong>
            <small>{statusText}</small>
          </span>
        </div>
        <div className={styles.actions}>
          {isCustomGroup && (
            <button
              type="button"
              aria-label={t('chat.manageGroup')}
              onClick={() => {
                setGroupTitle(conversation.title || '');
                setIsGroupEditorOpen((value) => !value);
                setIsOptionsOpen(false);
              }}
            >
              <UserPlus aria-hidden="true" size={17} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            className={isMuted ? styles.notificationButtonMuted : undefined}
            aria-label={
              isMuted
                ? `${t('chat.notificationPreferences')}: ${t('chat.notificationsMuted')}`
                : t('chat.notificationPreferences')
            }
            aria-expanded={isOptionsOpen}
            title={isMuted ? t('chat.notificationsMuted') : t('chat.notificationPreferences')}
            onClick={() => {
              setIsOptionsOpen((value) => !value);
              setIsGroupEditorOpen(false);
            }}
          >
            {isMuted ? (
              <BellOff aria-hidden="true" size={18} strokeWidth={2.2} />
            ) : (
              <Bell aria-hidden="true" size={17} strokeWidth={2} />
            )}
          </button>
          <button type="button" aria-label={t('chat.close')} onClick={handleCloseClick}>
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </div>
        {isOptionsOpen && (
          <div className={styles.headerMenu} role="menu">
            <strong>{t('chat.notifications')}</strong>
            <button type="button" onClick={() => updatePreferences('all')}>
              {t('chat.notifyAll')}
            </button>
            <button type="button" onClick={() => updatePreferences('mentions')}>
              {t('chat.notifyMentions')}
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreferences(
                  currentParticipant?.notificationLevel || 'all',
                  new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                )
              }
            >
              {t('chat.muteOneHour')}
            </button>
            <button type="button" onClick={muteUntilEndOfDay}>
              {t('chat.muteUntilTomorrow')}
            </button>
            <button type="button" onClick={() => updatePreferences('none')}>
              {t('chat.mutePermanently')}
            </button>
            {currentParticipant?.isMuted && (
              <button type="button" onClick={() => updatePreferences('all')}>
                {t('chat.unmute')}
              </button>
            )}
          </div>
        )}
        {isGroupEditorOpen && (
          <div className={styles.groupEditor}>
            <strong>{t('chat.manageGroup')}</strong>
            {isGroupOwner && (
              <div className={styles.groupTitleEditor}>
                <input
                  value={groupTitle}
                  maxLength={128}
                  aria-label={t('chat.groupName')}
                  onChange={(event) => setGroupTitle(event.target.value)}
                />
                <button type="button" onClick={handleGroupTitleSave}>
                  {t('chat.save')}
                </button>
              </div>
            )}
            <div className={styles.groupMembers}>
              {members.map((member) => {
                const isParticipant = participantUserIds.has(member.id);
                return (
                  <div key={member.id}>
                    <span>{member.name}</span>
                    {isGroupOwner && member.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            isParticipant
                              ? entryActions.deleteChatConversationParticipant(id, member.id)
                              : entryActions.addChatConversationParticipants(id, [member.id]),
                          )
                        }
                      >
                        {isParticipant ? t('chat.removeFromGroup') : t('chat.addToGroup')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.leaveGroup}
              onClick={() => {
                dispatch(entryActions.leaveChatConversation(id));
                closeConversation(id);
              }}
            >
              <LogOut aria-hidden="true" size={15} /> {t('chat.leaveGroup')}
            </button>
          </div>
        )}
      </header>

      {conversation.isBlocked && (
        <div className={styles.blocked}>{t('chat.blockedConversation')}</div>
      )}
      <MessageList
        conversationId={id}
        conversations={conversations}
        currentUserId={currentUser.id}
        hasMore={hasMoreMessages}
        hasMoreAfter={hasMoreNewerMessages}
        initialLastReadMessageId={initialReadStateRef.current.lastReadMessageId}
        initialUnreadCount={initialReadStateRef.current.unreadCount}
        isDirect={conversation.type === 'projectDirect'}
        isFetching={isMessagesFetching}
        members={members}
        messages={messages}
        otherReadMessageId={otherParticipant?.lastReadMessageId}
        projectId={project.id}
        projectName={project.name}
        typingUserIds={typingUserIds}
      />
      <MessageComposer conversationId={id} isDisabled={conversation.isBlocked} />
    </section>
  );
});

ChatWindow.propTypes = {
  id: PropTypes.string.isRequired,
};

export default ChatWindow;
