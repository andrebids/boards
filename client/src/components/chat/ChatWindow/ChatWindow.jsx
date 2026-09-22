import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  AtSign,
  Bell,
  BellOff,
  LogOut,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';

import { AlertDialog, CloseButton } from '../../../lib/custom-ui';
import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useChat } from '../ChatContext';
import ChatAvatar from '../ChatAvatar';
import MessageComposer from '../MessageComposer';
import MessageList from '../MessageList';
import LeaveGroupDialog from '../LeaveGroupDialog';
import useChatParticipantMuteState from '../useChatParticipantMuteState';
import { consumeReplyIntent } from '../deep-link';
import { compareIds } from '../../../utils/id-helpers';
import {
  getConversationTitle,
  getDirectUser,
  isChatParticipantMentionsOnly,
  isCustomGroupConversation,
  isGeneralConversation,
} from '../utils';

import styles from './ChatWindow.module.scss';

const READ_HORIZON_DEBOUNCE_MS = 500;

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
  const selectIsHistoryClearingByConversationId = useMemo(
    () => selectors.makeSelectIsChatHistoryClearingByConversationId(),
    [],
  );
  const selectHistoryClearErrorByConversationId = useMemo(
    () => selectors.makeSelectChatHistoryClearErrorByConversationId(),
    [],
  );

  const conversation = useSelector((state) => selectConversationById(state, id));
  const groupUpdate = useSelector((state) => state.chat.conversationUpdatesById?.[id]);
  const messagesError = useSelector((state) => state.chat.errorsByScope[`messages:${id}`]);
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
  const isHistoryClearing = useSelector((state) =>
    selectIsHistoryClearingByConversationId(state, id),
  );
  const historyClearError = useSelector((state) =>
    selectHistoryClearErrorByConversationId(state, id),
  );

  const dispatch = useDispatch();
  const {
    closeConversation,
    consumeGroupManager,
    groupManagerConversationId,
    openConversationList,
    toggleConversationMinimized,
  } = useChat();
  const fetchedConversationIdRef = useRef(null);
  const initialReadStateRef = useRef(null);
  const filesDropHandlerRef = useRef(null);
  const currentVisibleMessageIdRef = useRef(null);
  const pendingReadMessageIdRef = useRef(null);
  const readHorizonTimeoutRef = useRef(null);
  const lastReadMessageIdRef = useRef(null);
  const actionsButtonRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const wasHistoryClearingRef = useRef(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState(null);
  const [hasSubmittedMemberRemoval, setHasSubmittedMemberRemoval] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const groupTitleRef = useRef(null);
  const [shouldFocusComposer, setShouldFocusComposer] = useState(false);

  const handleFilesDrop = useCallback((acceptedFiles) => {
    filesDropHandlerRef.current?.(acceptedFiles);
  }, []);
  const handleFilesDropHandlerChange = useCallback((handler) => {
    filesDropHandlerRef.current = handler;
  }, []);
  const { getRootProps, isDragActive } = useDropzone({
    disabled: !conversation || conversation.isBlocked || conversation.canWrite === false,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: handleFilesDrop,
  });

  useEffect(() => {
    if (conversation?.isHistorical) {
      setIsGroupEditorOpen(false);
      setPendingMemberRemoval(null);
    }
  }, [conversation?.isHistorical]);

  useEffect(() => {
    if (
      hasSubmittedMemberRemoval &&
      groupUpdate?.operation === 'remove-member' &&
      groupUpdate.isSuccess
    ) {
      setPendingMemberRemoval(null);
      setHasSubmittedMemberRemoval(false);
    }
  }, [groupUpdate, hasSubmittedMemberRemoval]);

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
    if (conversation && consumeReplyIntent(id)) {
      setShouldFocusComposer(true);
    }
  }, [conversation, id]);

  useEffect(() => {
    if (conversation && !conversation.isHistorical && groupManagerConversationId === id) {
      setGroupTitle(conversation.title || '');
      setIsGroupEditorOpen(true);
      setIsOptionsOpen(false);
      setIsActionsOpen(false);
      consumeGroupManager(id);
    }
  }, [consumeGroupManager, conversation, groupManagerConversationId, id]);

  useEffect(() => {
    if (isGroupEditorOpen) {
      groupTitleRef.current?.focus();
    }
  }, [isGroupEditorOpen]);

  useEffect(() => {
    if (isHistoryClearing) {
      wasHistoryClearingRef.current = true;
    } else if (wasHistoryClearingRef.current) {
      wasHistoryClearingRef.current = false;
      if (!historyClearError) {
        setIsHistoryDialogOpen(false);
      }
    }
  }, [historyClearError, isHistoryClearing]);

  useEffect(() => {
    if (!isActionsOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      actionsMenuRef.current?.querySelector('button')?.focus();
    });
    const handlePointerDown = (event) => {
      if (
        !actionsButtonRef.current?.contains(event.target) &&
        !actionsMenuRef.current?.contains(event.target)
      ) {
        setIsActionsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsActionsOpen(false);
        actionsButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionsOpen]);

  const currentParticipant = conversation?.participants?.find(
    ({ userId }) => userId === currentUser.id,
  );
  const unreadCountRef = useRef(conversation?.unreadCount || 0);
  unreadCountRef.current = conversation?.unreadCount || 0;
  if (
    currentParticipant?.lastReadMessageId &&
    (!lastReadMessageIdRef.current ||
      compareIds(currentParticipant.lastReadMessageId, lastReadMessageIdRef.current) > 0)
  ) {
    lastReadMessageIdRef.current = currentParticipant.lastReadMessageId;
  }

  const flushReadHorizon = useCallback(() => {
    const messageId = pendingReadMessageIdRef.current;
    if (!messageId) return;

    pendingReadMessageIdRef.current = null;
    readHorizonTimeoutRef.current = null;
    dispatch(entryActions.markChatConversationAsRead(id, messageId));
  }, [dispatch, id]);

  const scheduleReadHorizon = useCallback(
    (messageId) => {
      currentVisibleMessageIdRef.current = messageId;
      if (
        !messageId ||
        !unreadCountRef.current ||
        document.visibilityState !== 'visible' ||
        !document.hasFocus() ||
        (lastReadMessageIdRef.current && compareIds(messageId, lastReadMessageIdRef.current) <= 0)
      ) {
        return;
      }

      if (
        pendingReadMessageIdRef.current &&
        compareIds(messageId, pendingReadMessageIdRef.current) <= 0
      ) {
        return;
      }

      pendingReadMessageIdRef.current = messageId;
      if (readHorizonTimeoutRef.current) {
        window.clearTimeout(readHorizonTimeoutRef.current);
      }
      readHorizonTimeoutRef.current = window.setTimeout(flushReadHorizon, READ_HORIZON_DEBOUNCE_MS);
    },
    [flushReadHorizon],
  );

  useEffect(() => {
    const handleFocus = () => scheduleReadHorizon(currentVisibleMessageIdRef.current);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      } else {
        flushReadHorizon();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', flushReadHorizon);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', flushReadHorizon);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (readHorizonTimeoutRef.current) {
        window.clearTimeout(readHorizonTimeoutRef.current);
      }
      flushReadHorizon();
    };
  }, [flushReadHorizon, scheduleReadHorizon]);

  const handleBackClick = useCallback(() => {
    toggleConversationMinimized(id);
    openConversationList();
  }, [id, openConversationList, toggleConversationMinimized]);

  const handleCloseClick = useCallback(() => {
    closeConversation(id);
  }, [closeConversation, id]);

  const isMuted = useChatParticipantMuteState(currentParticipant);
  const isMentionsOnly = isChatParticipantMentionsOnly(currentParticipant);
  const hasConfiguredNotifications = isMuted || isMentionsOnly;
  let NotificationIcon = Bell;
  let notificationStateLabel = t('chat.notificationPreferences');
  if (isMuted) {
    NotificationIcon = BellOff;
    notificationStateLabel = t('chat.notificationsMuted');
  } else if (isMentionsOnly) {
    NotificationIcon = AtSign;
    notificationStateLabel = t('chat.notifyMentions');
  }

  if (!conversation || !project) {
    return null;
  }

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
  const isWriteDisabled = conversation.isBlocked || conversation.canWrite === false;
  if (conversation.isHistorical) {
    statusText =
      currentParticipant?.leftReason === 'removed'
        ? t('chat.removedFromGroup')
        : t('chat.leftGroup');
  } else if (conversation.isBlocked) {
    statusText = t('chat.conversationUnavailable');
  } else if (isCustomGroupConversation(conversation) && !conversation.canWrite) {
    statusText = t('chat.singleMemberGroup');
  } else if (directUser?.isOnline) {
    statusText = t('chat.available');
  } else if (isCustomGroupConversation(conversation)) {
    statusText = t('chat.groupMemberCount', {
      count: conversation.participantUserIds?.length || 0,
    });
  }

  const isCustomGroup = isCustomGroupConversation(conversation);
  let writeDisabledNotice = 'chat.singleMemberNotice';
  if (conversation.isHistorical) {
    writeDisabledNotice =
      currentParticipant?.leftReason === 'removed'
        ? 'chat.removedGroupHistoryNotice'
        : 'chat.leftGroupHistoryNotice';
  } else if (conversation.isBlocked) {
    writeDisabledNotice = 'chat.blockedConversation';
  }
  const isGroupOwner = !conversation.isHistorical && currentParticipant?.role === 'owner';
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

  const handleGroupTitleSave = (event) => {
    event.preventDefault();
    const titleValue = groupTitle.trim();
    if (!groupUpdate?.isPending && titleValue && titleValue !== conversation.title) {
      dispatch(entryActions.updateChatConversation(id, { title: titleValue }));
    }
  };

  return (
    // React Dropzone exposes the accessible drag-and-drop handlers as root props.
    // eslint-disable-next-line react/jsx-props-no-spreading
    <section {...getRootProps({ className: styles.window })} aria-label={title}>
      {isDragActive && (
        <div aria-live="polite" className={styles.dropOverlay} role="status">
          {t('chat.dropFilesHere')}
        </div>
      )}
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
          {isCustomGroup && !conversation.isHistorical && (
            <button
              type="button"
              className={isGroupEditorOpen ? styles.actionButtonActive : undefined}
              aria-label={t('chat.manageGroup')}
              title={t('chat.manageGroup')}
              aria-expanded={isGroupEditorOpen}
              onClick={() => {
                setGroupTitle(conversation.title || '');
                setIsGroupEditorOpen((value) => !value);
                setIsOptionsOpen(false);
                setIsActionsOpen(false);
              }}
            >
              <UserPlus aria-hidden="true" size={17} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            className={hasConfiguredNotifications ? styles.notificationButtonConfigured : undefined}
            aria-label={
              hasConfiguredNotifications
                ? `${t('chat.notificationPreferences')}: ${notificationStateLabel}`
                : t('chat.notificationPreferences')
            }
            aria-expanded={isOptionsOpen}
            title={notificationStateLabel}
            onClick={() => {
              setIsOptionsOpen((value) => !value);
              setIsGroupEditorOpen(false);
              setIsActionsOpen(false);
            }}
          >
            <NotificationIcon
              aria-hidden="true"
              size={hasConfiguredNotifications ? 18 : 17}
              strokeWidth={hasConfiguredNotifications ? 2.2 : 2}
            />
          </button>
          <button
            ref={actionsButtonRef}
            type="button"
            aria-label={t('chat.conversationActions')}
            aria-expanded={isActionsOpen}
            aria-haspopup="menu"
            onClick={() => {
              setIsActionsOpen((value) => !value);
              setIsOptionsOpen(false);
              setIsGroupEditorOpen(false);
            }}
          >
            <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2} />
          </button>
          <CloseButton ariaLabel={t('chat.close')} onClick={handleCloseClick} />
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
            {isMuted && (
              <button type="button" onClick={() => updatePreferences('all')}>
                {t('chat.unmute')}
              </button>
            )}
          </div>
        )}
        {isActionsOpen && (
          <div
            ref={actionsMenuRef}
            className={`${styles.headerMenu} ${styles.actionsMenu}`}
            role="menu"
          >
            {isCustomGroup && isGroupOwner && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setGroupTitle(conversation.title || '');
                  setIsGroupEditorOpen(true);
                  setIsActionsOpen(false);
                }}
              >
                <Pencil aria-hidden="true" size={15} />
                {t('chat.editGroupName')}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={styles.destructiveAction}
              onClick={() => {
                setIsActionsOpen(false);
                setIsHistoryDialogOpen(true);
              }}
            >
              <Trash2 aria-hidden="true" size={15} />
              {t(
                conversation.isHistorical
                  ? 'chat.removeConversationFromList'
                  : 'chat.removeConversationHistory',
              )}
            </button>
          </div>
        )}
        {isGroupEditorOpen && !conversation.isHistorical && (
          <div className={styles.groupEditor} role="dialog" aria-label={t('chat.manageGroup')}>
            <div className={styles.groupEditorHeader}>
              <span className={styles.groupEditorIcon}>
                <Users aria-hidden="true" size={17} strokeWidth={2} />
              </span>
              <span className={styles.groupEditorHeading}>
                <strong>{t('chat.manageGroup')}</strong>
                <small>
                  {t('chat.groupMemberCount', {
                    count: conversation.participantUserIds?.length || 0,
                  })}
                </small>
              </span>
              <CloseButton
                ariaLabel={t('chat.close')}
                className={styles.groupEditorClose}
                title={t('chat.close')}
                onClick={() => setIsGroupEditorOpen(false)}
              />
            </div>
            {isGroupOwner && (
              <form className={styles.groupTitleEditor} onSubmit={handleGroupTitleSave}>
                <label htmlFor={`chat-group-title-${id}`}>{t('chat.groupName')}</label>
                <input
                  ref={groupTitleRef}
                  id={`chat-group-title-${id}`}
                  value={groupTitle}
                  maxLength={80}
                  required
                  disabled={groupUpdate?.isPending}
                  aria-label={t('chat.groupName')}
                  onChange={(event) => setGroupTitle(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={
                    groupUpdate?.isPending ||
                    !groupTitle.trim() ||
                    groupTitle.trim() === conversation.title
                  }
                >
                  {t(groupUpdate?.isPending ? 'chat.saving' : 'chat.save')}
                </button>
                {groupUpdate?.operation === 'title' && groupUpdate.error && (
                  <p role="alert">{t('chat.groupNameSaveFailed')}</p>
                )}
                {groupUpdate?.operation === 'title' &&
                  groupUpdate.isSuccess &&
                  groupTitle.trim() === conversation.title && (
                    <p role="status">{t('chat.groupNameSaved')}</p>
                  )}
              </form>
            )}
            <div className={styles.groupMembers}>
              {isGroupOwner && (
                <p className={styles.groupMemberNotice}>{t('chat.rejoinGroupNotice')}</p>
              )}
              {groupUpdate?.operation === 'add-member' && groupUpdate.error && (
                <p role="alert">{t('chat.addGroupMemberFailed')}</p>
              )}
              {members.map((member) => {
                const isParticipant = participantUserIds.has(member.id);
                return (
                  <div key={member.id} className={styles.groupMember}>
                    <ChatAvatar user={member} isOnline={member.isOnline} />
                    <span className={styles.groupMemberCopy}>
                      <strong>{member.name}</strong>
                      <small>{member.username || t('chat.memberOfProject')}</small>
                    </span>
                    {isGroupOwner && member.id !== currentUser.id && (
                      <button
                        type="button"
                        disabled={groupUpdate?.isPending}
                        className={
                          isParticipant ? styles.removeMemberButton : styles.addMemberButton
                        }
                        onClick={() => {
                          if (isParticipant) {
                            setHasSubmittedMemberRemoval(false);
                            setPendingMemberRemoval(member);
                          } else {
                            dispatch(entryActions.addChatConversationParticipants(id, [member.id]));
                          }
                        }}
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
              disabled={groupUpdate?.isPending}
              onClick={() => setIsLeaveDialogOpen(true)}
            >
              <LogOut aria-hidden="true" size={15} /> {t('chat.leaveGroup')}
            </button>
          </div>
        )}
      </header>

      {isWriteDisabled && (
        <div className={styles.blocked} role="status">
          {t(writeDisabledNotice)}
        </div>
      )}
      {messagesError && (
        <div className={styles.blocked} role="alert">
          {t('chat.loadMessagesFailed')}{' '}
          <button
            type="button"
            disabled={isMessagesFetching}
            onClick={() => dispatch(entryActions.fetchChatMessages(id, { replace: true }))}
          >
            {t('chat.retry')}
          </button>
        </div>
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
        isDisabled={isWriteDisabled}
        isFetching={isMessagesFetching}
        members={members}
        messages={messages}
        onReadHorizonChange={scheduleReadHorizon}
        otherReadMessageId={otherParticipant?.lastReadMessageId}
        projectId={project.id}
        projectName={project.name}
        typingUserIds={typingUserIds}
      />
      <MessageComposer
        autoFocus={shouldFocusComposer}
        conversationId={id}
        isDisabled={isWriteDisabled}
        onFilesDropHandlerChange={handleFilesDropHandlerChange}
      />
      <AlertDialog
        cancelLabel={t('action.cancel')}
        confirmLabel={t(
          conversation.isHistorical
            ? 'chat.removeConversationFromList'
            : 'chat.removeConversationHistory',
        )}
        description={t(
          conversation.isHistorical
            ? 'chat.confirmRemoveConversationFromList'
            : 'chat.confirmRemoveConversationHistory',
          { conversation: title },
        )}
        isPending={isHistoryClearing}
        open={isHistoryDialogOpen}
        title={t(
          conversation.isHistorical
            ? 'chat.removeConversationFromList'
            : 'chat.removeConversationHistory',
        )}
        tone="danger"
        onCancel={() => setIsHistoryDialogOpen(false)}
        onConfirm={() => {
          if (conversation.isHistorical) {
            dispatch(entryActions.clearChatConversationHistory(id, true));
          } else {
            dispatch(entryActions.clearChatConversationHistory(id));
          }
        }}
      >
        {historyClearError && <span role="alert">{t('chat.removeConversationHistoryFailed')}</span>}
      </AlertDialog>
      <AlertDialog
        cancelLabel={t('action.cancel')}
        confirmLabel={t('chat.removeFromGroup')}
        description={t('chat.confirmRemoveGroupMember', { member: pendingMemberRemoval?.name })}
        open={Boolean(pendingMemberRemoval)}
        isPending={Boolean(groupUpdate?.isPending)}
        title={t('chat.removeFromGroup')}
        tone="danger"
        onCancel={() => setPendingMemberRemoval(null)}
        onConfirm={() => {
          if (pendingMemberRemoval && !groupUpdate?.isPending) {
            setHasSubmittedMemberRemoval(true);
            dispatch(entryActions.deleteChatConversationParticipant(id, pendingMemberRemoval.id));
          }
        }}
      >
        {hasSubmittedMemberRemoval &&
          groupUpdate?.operation === 'remove-member' &&
          groupUpdate.error && <span role="alert">{t('chat.removeGroupMemberFailed')}</span>}
      </AlertDialog>
      {isLeaveDialogOpen && (
        <LeaveGroupDialog
          conversationId={id}
          conversationTitle={title}
          isOwner={isGroupOwner}
          onClose={() => setIsLeaveDialogOpen(false)}
        />
      )}
    </section>
  );
});

ChatWindow.propTypes = {
  id: PropTypes.string.isRequired,
};

export default ChatWindow;
