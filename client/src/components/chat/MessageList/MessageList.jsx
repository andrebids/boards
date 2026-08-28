import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import LinkifyReact from 'linkify-react';
import {
  Check,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Forward,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Quote,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import { AlertDialog } from '../../../lib/custom-ui';
import UserAvatar from '../../users/UserAvatar';
import LazyEmojiPicker, {
  EMOJI_CATEGORY_ICONS,
  EMOJI_PICKER_CLASS_NAME,
  EMOJI_PICKER_HEIGHT,
  EMOJI_PICKER_WIDTH,
} from '../LazyEmojiPicker';
import { getReactionEmojiPickerPosition, QUICK_REACTION_EMOJIS } from '../reaction-utils';
import { getConversationTitle, getParticipantUserIds, isDirectConversation } from '../utils';
import { compareIds } from '../../../utils/id-helpers';
import { getAttachmentDeliveryErrorMessage } from './attachment-state';
import AttachmentPreview from './AttachmentPreview';
import MessageAttachments, { SendingStatus } from './MessageAttachments';
import {
  classifyMessageAttachments,
  createMemberNameById,
  formatMessageDay,
  formatMessageTime,
  getMessageGrouping,
  isEmojiOnlyMessage,
} from './message-view';
import {
  getReadHorizonMessageId,
  getScrollBehavior,
  keepBottomAfterContentLoad,
  shouldScrollToNewestMessage,
} from './scroll';

import styles from './MessageList.module.scss';

const renderMessageText = (text, currentUserId) => {
  const parts = String(text).split(/(@\[[^\]]+\]\([^)]*\))/g);
  let offset = 0;
  return parts.map((part) => {
    const partOffset = offset;
    offset += part.length;
    const match = part.match(/^@\[([^\]]+)\]\(([^)]*)\)$/);
    return match ? (
      <span
        key={`${match[1]}-${partOffset}`}
        className={`${styles.mention} ${match[2] === currentUserId ? styles.mentionSelf : ''}`}
      >
        @{match[1]}
      </span>
    ) : (
      part
    );
  });
};

const MessageList = React.memo(
  ({
    conversationId,
    conversations,
    currentUserId,
    hasMore,
    hasMoreAfter,
    initialLastReadMessageId,
    initialUnreadCount,
    isDirect,
    isFetching,
    members,
    messages,
    onReadHorizonChange,
    otherReadMessageId,
    projectId,
    projectName,
    typingUserIds,
  }) => {
    const [t] = useTranslation();
    const listRef = useRef(null);
    const activeMessageActionsRef = useRef(null);
    const reactionEmojiPickerRef = useRef(null);
    const previousLastIdRef = useRef(null);
    const prependScrollStateRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const [activeReactionMenuMessageId, setActiveReactionMenuMessageId] = useState(null);
    const [activeActionsMessageId, setActiveActionsMessageId] = useState(null);
    const [forwardingMessageId, setForwardingMessageId] = useState(null);
    const [pendingForward, setPendingForward] = useState(null);
    const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [focusedMessageId, setFocusedMessageId] = useState(() => {
      const parameters = new URLSearchParams(window.location.search);
      return parameters.get('chatConversation') === conversationId
        ? parameters.get('chatMessage')
        : null;
    });
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isReactionEmojiPickerOpen, setIsReactionEmojiPickerOpen] = useState(false);
    const [reactionEmojiPickerPosition, setReactionEmojiPickerPosition] = useState(null);
    const dispatch = useDispatch();
    const memberNameById = useMemo(() => createMemberNameById(members), [members]);

    const unreadStartIndex = useMemo(() => {
      if (!initialUnreadCount) return -1;
      const cursorIndex = messages.findIndex(({ id }) => id === initialLastReadMessageId);
      return cursorIndex >= 0 ? cursorIndex + 1 : Math.max(0, messages.length - initialUnreadCount);
    }, [initialLastReadMessageId, initialUnreadCount, messages]);

    const lastReadOwnMessageId = useMemo(() => {
      if (!isDirect || !otherReadMessageId) return null;
      return messages.reduce(
        (result, message) =>
          message.userId === currentUserId &&
          !message.localId &&
          compareIds(message.id, otherReadMessageId) <= 0
            ? message.id
            : result,
        null,
      );
    }, [currentUserId, isDirect, messages, otherReadMessageId]);

    const typingNames = useMemo(
      () =>
        typingUserIds
          .filter((id) => id !== currentUserId)
          .map((id) => memberNameById.get(id))
          .filter(Boolean),
      [currentUserId, memberNameById, typingUserIds],
    );

    const directConversationsByUserId = useMemo(() => {
      const result = new Map();
      conversations.forEach((conversation) => {
        if (
          conversation.id !== conversationId &&
          !conversation.isBlocked &&
          isDirectConversation(conversation)
        ) {
          getParticipantUserIds(conversation).forEach((userId) => {
            if (userId !== currentUserId) {
              result.set(userId, conversation);
            }
          });
        }
      });
      return result;
    }, [conversationId, conversations, currentUserId]);

    const forwardConversationTargets = useMemo(
      () =>
        conversations.filter(
          (conversation) =>
            conversation.id !== conversationId &&
            !conversation.isBlocked &&
            !isDirectConversation(conversation),
        ),
      [conversationId, conversations],
    );

    const forwardMemberTargets = useMemo(
      () => members.filter((member) => member.id !== currentUserId),
      [currentUserId, members],
    );

    const scrollToBottom = useCallback(() => {
      const list = listRef.current;
      if (list) {
        list.scrollTo({
          top: list.scrollHeight,
          behavior: getScrollBehavior(),
        });
        isAtBottomRef.current = true;
        setNewMessageCount(0);
      }
    }, []);

    const handleAttachmentLoad = useCallback(() => {
      keepBottomAfterContentLoad(listRef.current, isAtBottomRef.current);
    }, []);

    const reportReadHorizon = useCallback(() => {
      const messageId = getReadHorizonMessageId(listRef.current, messages);
      if (messageId) onReadHorizonChange(messageId);
    }, [messages, onReadHorizonChange]);

    const focusMessage = useCallback(
      (messageId) => {
        const element = listRef.current?.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          setFocusedMessageId(messageId);
          window.setTimeout(() => setFocusedMessageId(null), 1800);
        } else {
          setFocusedMessageId(messageId);
          dispatch(
            entryActions.fetchChatMessages(conversationId, {
              aroundId: messageId,
              replace: true,
            }),
          );
        }
      },
      [conversationId, dispatch],
    );

    useLayoutEffect(() => {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;
      const list = listRef.current;
      const prependScrollState = prependScrollStateRef.current;
      if (prependScrollState && list) {
        list.scrollTop = list.scrollHeight - prependScrollState.height + prependScrollState.top;
        prependScrollStateRef.current = null;
      } else if (focusedMessageId) {
        const element = list?.querySelector(`[data-message-id="${focusedMessageId}"]`);
        if (element) {
          element.scrollIntoView({ block: 'center' });
          window.setTimeout(() => setFocusedMessageId(null), 1800);
        }
      } else if (previousLastIdRef.current === null && list) {
        list.scrollTop = list.scrollHeight;
      } else if (previousLastIdRef.current !== lastMessage.id && list) {
        if (
          shouldScrollToNewestMessage({
            isAtBottom: isAtBottomRef.current,
            message: lastMessage,
            currentUserId,
          })
        ) {
          list.scrollTo({
            top: list.scrollHeight,
            behavior: getScrollBehavior(),
          });
        } else {
          setNewMessageCount((count) => count + 1);
        }
      }
      previousLastIdRef.current = lastMessage.id;
      reportReadHorizon();
    }, [currentUserId, focusedMessageId, messages, reportReadHorizon]);

    const handleScroll = useCallback(
      (event) => {
        const list = event.currentTarget;
        reportReadHorizon();
        isAtBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
        if (isAtBottomRef.current) setNewMessageCount(0);
        if (isAtBottomRef.current && hasMoreAfter && !isFetching) {
          const lastPersistedMessage = [...messages]
            .reverse()
            .find((message) => message.isPersisted);
          if (lastPersistedMessage) {
            dispatch(
              entryActions.fetchChatMessages(conversationId, {
                afterId: lastPersistedMessage.id,
              }),
            );
            return;
          }
        }
        if (list.scrollTop <= 12 && hasMore && !isFetching) {
          prependScrollStateRef.current = {
            height: list.scrollHeight,
            top: list.scrollTop,
          };
          dispatch(entryActions.fetchChatMessages(conversationId));
        }
      },
      [conversationId, dispatch, hasMore, hasMoreAfter, isFetching, messages, reportReadHorizon],
    );

    const closeMenus = useCallback(() => {
      setActiveActionsMessageId(null);
      setActiveReactionMenuMessageId(null);
      setForwardingMessageId(null);
      setIsReactionEmojiPickerOpen(false);
      setReactionEmojiPickerPosition(null);
    }, []);

    useEffect(() => {
      if (!activeActionsMessageId && !forwardingMessageId) {
        return undefined;
      }

      const closeOnOutsidePointerDown = (event) => {
        if (!activeMessageActionsRef.current?.contains(event.target)) {
          closeMenus();
        }
      };

      document.addEventListener('pointerdown', closeOnOutsidePointerDown, true);
      return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true);
    }, [activeActionsMessageId, closeMenus, forwardingMessageId]);

    const handleMessageAction = useCallback(
      (action, message) => {
        if (action === 'reply') {
          dispatch(entryActions.setChatReplyTarget(conversationId, message));
        } else if (action === 'edit') {
          setEditingMessageId(message.id);
          setEditingText(message.text || '');
        } else if (action === 'delete') {
          setPendingDeleteMessageId(message.id);
        } else if (action === 'link') {
          const url = new URL(`/projects/${projectId}`, window.location.origin);
          url.searchParams.set('chatConversation', conversationId);
          url.searchParams.set('chatMessage', message.id);
          navigator.clipboard?.writeText(url.toString());
        } else if (action === 'forward') {
          setForwardingMessageId(message.id);
          return;
        }
        closeMenus();
      },
      [closeMenus, conversationId, dispatch, projectId, t],
    );

    const handleDeleteMessageCancel = useCallback(() => {
      setPendingDeleteMessageId(null);
    }, []);

    const handleDeleteMessageConfirm = useCallback(() => {
      if (pendingDeleteMessageId) {
        dispatch(entryActions.deleteChatMessage(pendingDeleteMessageId));
      }
      setPendingDeleteMessageId(null);
    }, [dispatch, pendingDeleteMessageId]);

    const saveEdit = useCallback(() => {
      const text = editingText.trim();
      if (editingMessageId && text) {
        dispatch(entryActions.updateChatMessage(editingMessageId, { text }));
      }
      setEditingMessageId(null);
      setEditingText('');
    }, [dispatch, editingMessageId, editingText]);

    const handleReactionClick = useCallback(
      (event) => {
        dispatch(
          entryActions.toggleChatMessageReaction(
            event.currentTarget.dataset.messageId,
            event.currentTarget.dataset.emoji,
          ),
        );
      },
      [dispatch],
    );

    const handleReactionMenuToggle = useCallback(
      (event) => {
        const { messageId } = event.currentTarget.dataset;
        if (activeReactionMenuMessageId === messageId) {
          setActiveReactionMenuMessageId(null);
          setIsReactionEmojiPickerOpen(false);
          setReactionEmojiPickerPosition(null);
          return;
        }

        setActiveReactionMenuMessageId(messageId);
        setReactionEmojiPickerPosition(
          getReactionEmojiPickerPosition(
            event.currentTarget,
            EMOJI_PICKER_WIDTH,
            EMOJI_PICKER_HEIGHT,
          ),
        );
        setIsReactionEmojiPickerOpen(true);
      },
      [activeReactionMenuMessageId],
    );

    const chooseReaction = useCallback(
      (messageId, emoji) => {
        dispatch(entryActions.toggleChatMessageReaction(messageId, emoji));
        setActiveReactionMenuMessageId(null);
        setIsReactionEmojiPickerOpen(false);
      },
      [dispatch],
    );

    const forwardToConversation = useCallback(
      (messageId, targetConversationId) => {
        dispatch(entryActions.forwardChatMessage(messageId, targetConversationId));
        closeMenus();
      },
      [closeMenus, dispatch],
    );

    const forwardToMember = useCallback(
      (messageId, userId) => {
        const existingConversation = directConversationsByUserId.get(userId);
        if (existingConversation) {
          forwardToConversation(messageId, existingConversation.id);
          return;
        }

        setPendingForward({ messageId, userId });
        dispatch(entryActions.createDirectChatConversation(projectId, userId));
        closeMenus();
      },
      [closeMenus, directConversationsByUserId, dispatch, forwardToConversation, projectId],
    );

    useEffect(() => {
      if (!pendingForward) {
        return;
      }

      const targetConversation = directConversationsByUserId.get(pendingForward.userId);
      if (!targetConversation) {
        return;
      }

      dispatch(entryActions.forwardChatMessage(pendingForward.messageId, targetConversation.id));
      setPendingForward(null);
    }, [directConversationsByUserId, dispatch, pendingForward]);

    useEffect(() => {
      if (!isReactionEmojiPickerOpen) return undefined;
      const close = (event) => {
        if (
          event?.target instanceof Node &&
          reactionEmojiPickerRef.current?.contains(event.target)
        ) {
          return;
        }

        setActiveReactionMenuMessageId(null);
        setIsReactionEmojiPickerOpen(false);
        setReactionEmojiPickerPosition(null);
      };
      const closeOnOutsidePointerDown = (event) => {
        if (
          event.target instanceof Node &&
          !reactionEmojiPickerRef.current?.contains(event.target)
        ) {
          close();
        }
      };
      window.addEventListener('resize', close);
      window.addEventListener('scroll', close, true);
      document.addEventListener('pointerdown', closeOnOutsidePointerDown, true);
      return () => {
        window.removeEventListener('resize', close);
        window.removeEventListener('scroll', close, true);
        document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true);
      };
    }, [isReactionEmojiPickerOpen]);

    if (isFetching && messages.length === 0) {
      return (
        <div className={styles.skeletons} aria-label={t('chat.loadingMessages')}>
          <span />
          <span />
          <span />
          <span />
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className={styles.empty}>
          <MessageCircle aria-hidden="true" size={28} strokeWidth={1.8} />
          <strong>{t('chat.emptyConversationTitle')}</strong>
          <span>{t('chat.emptyConversationDescription')}</span>
        </div>
      );
    }

    return (
      <div className={styles.listShell}>
        <div ref={listRef} className={styles.list} onScroll={handleScroll}>
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            const { continuesNext, continuesPrevious, startsNewDay } = getMessageGrouping(
              message,
              previousMessage,
              nextMessage,
            );
            const isOwn = message.userId === currentUserId;
            const reactions = message.reactions || [];
            const replyAuthor = memberNameById.get(message.replyTo?.userId);
            const { imageAttachments, otherAttachments } = classifyMessageAttachments(message);
            const hasImageAttachments = imageAttachments.length > 0;
            const hasTextBubble =
              !hasImageAttachments &&
              (message.deletedAt || message.text || editingMessageId === message.id);
            const isEmojiOnly =
              !message.deletedAt &&
              editingMessageId !== message.id &&
              isEmojiOnlyMessage(message.text);
            let messageBody;
            if (message.deletedAt) {
              messageBody = <em>{t('chat.messageDeleted')}</em>;
            } else if (editingMessageId === message.id) {
              messageBody = (
                <div className={styles.inlineEditor}>
                  <textarea
                    value={editingText}
                    maxLength={10000}
                    aria-label={t('chat.editMessage')}
                    onChange={(event) => setEditingText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setEditingMessageId(null);
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        saveEdit();
                      }
                    }}
                  />
                  <span>
                    <button
                      type="button"
                      aria-label={t('chat.cancel')}
                      onClick={() => setEditingMessageId(null)}
                    >
                      <X aria-hidden="true" size={14} strokeWidth={1.5} />
                    </button>
                    <button type="button" aria-label={t('chat.save')} onClick={saveEdit}>
                      <Check aria-hidden="true" size={14} />
                    </button>
                  </span>
                </div>
              );
            } else {
              messageBody = (
                <LinkifyReact options={{ target: '_blank', rel: 'noreferrer' }}>
                  {renderMessageText(message.text, currentUserId)}
                </LinkifyReact>
              );
            }

            return (
              <React.Fragment key={message.id || message.localId}>
                {startsNewDay && (
                  <div className={styles.dayDivider}>
                    <span>{formatMessageDay(message.createdAt)}</span>
                  </div>
                )}
                {index === unreadStartIndex && (
                  <div className={styles.unreadDivider}>{t('chat.newMessages')}</div>
                )}
                <div
                  data-chat-message-row
                  data-message-id={message.id}
                  className={`${styles.messageRow} ${isOwn ? styles.own : ''} ${
                    continuesPrevious ? styles.continuesPrevious : ''
                  } ${continuesNext ? styles.continuesNext : ''} ${
                    focusedMessageId === message.id ? styles.focusedMessage : ''
                  }`}
                >
                  {!isOwn && !continuesNext && (
                    <UserAvatar id={message.userId} size="tiny" className={styles.messageAvatar} />
                  )}
                  {!isOwn && continuesNext && <span className={styles.avatarSpacer} />}
                  <div className={styles.messageContent}>
                    {!continuesPrevious && (
                      <span className={styles.groupTime}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                    )}
                    {!message.deletedAt && !message.localId && (
                      <div
                        className={`${styles.hoverActions} ${
                          activeReactionMenuMessageId === message.id ||
                          activeActionsMessageId === message.id ||
                          forwardingMessageId === message.id
                            ? styles.hoverActionsOpen
                            : ''
                        }`}
                        role="group"
                        aria-label={t('chat.messageActions')}
                      >
                        {QUICK_REACTION_EMOJIS.map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            className={styles.quickReactionButton}
                            aria-label={`${t('chat.addEmoji')}: ${emoji}`}
                            onClick={() => chooseReaction(message.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className={styles.reactionControl}>
                          <button
                            type="button"
                            data-message-id={message.id}
                            aria-label={t('chat.addEmoji')}
                            onClick={handleReactionMenuToggle}
                          >
                            <SmilePlus aria-hidden="true" size={15} />
                          </button>
                          {activeReactionMenuMessageId === message.id &&
                            isReactionEmojiPickerOpen &&
                            reactionEmojiPickerPosition &&
                            document.getElementById('app') &&
                            createPortal(
                              <div
                                className={styles.floatingReactionEmojiMenu}
                                ref={reactionEmojiPickerRef}
                                style={reactionEmojiPickerPosition}
                              >
                                <Suspense fallback={null}>
                                  <LazyEmojiPicker
                                    categoryIcons={EMOJI_CATEGORY_ICONS}
                                    className={EMOJI_PICKER_CLASS_NAME}
                                    theme="dark"
                                    width={EMOJI_PICKER_WIDTH}
                                    height={EMOJI_PICKER_HEIGHT}
                                    previewConfig={{ showPreview: false }}
                                    searchPlaceholder={t('chat.searchEmoji')}
                                    onEmojiClick={(emojiData) =>
                                      chooseReaction(message.id, emojiData.emoji)
                                    }
                                  />
                                </Suspense>
                              </div>,
                              document.getElementById('app'),
                            )}
                        </div>
                        <span className={styles.hoverActionDivider} aria-hidden="true" />
                        <button
                          type="button"
                          className={styles.replyAction}
                          aria-label={t('chat.reply')}
                          onClick={() => handleMessageAction('reply', message)}
                        >
                          <Quote aria-hidden="true" size={15} />
                        </button>
                        <div
                          ref={
                            activeActionsMessageId === message.id ||
                            forwardingMessageId === message.id
                              ? activeMessageActionsRef
                              : null
                          }
                          className={styles.messageActions}
                        >
                          <button
                            type="button"
                            aria-label={t('chat.messageActions')}
                            aria-expanded={activeActionsMessageId === message.id}
                            onClick={() =>
                              setActiveActionsMessageId((current) =>
                                current === message.id ? null : message.id,
                              )
                            }
                          >
                            <MoreHorizontal aria-hidden="true" size={15} />
                          </button>
                          {activeActionsMessageId === message.id && (
                            <div className={styles.actionsMenu} role="menu">
                              {isOwn && (
                                <button
                                  type="button"
                                  onClick={() => handleMessageAction('edit', message)}
                                >
                                  <Pencil aria-hidden="true" size={14} /> {t('chat.editMessage')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleMessageAction('link', message)}
                              >
                                <Link2 aria-hidden="true" size={14} /> {t('chat.copyMessageLink')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMessageAction('forward', message)}
                              >
                                <Forward aria-hidden="true" size={14} /> {t('chat.forwardMessage')}
                              </button>
                              {isOwn && (
                                <button
                                  type="button"
                                  className={styles.destructiveAction}
                                  onClick={() => handleMessageAction('delete', message)}
                                >
                                  <Trash2 aria-hidden="true" size={14} /> {t('chat.deleteMessage')}
                                </button>
                              )}
                            </div>
                          )}
                          {forwardingMessageId === message.id && (
                            <div className={styles.forwardMenu}>
                              <strong>{t('chat.forwardTo')}</strong>
                              {forwardConversationTargets.map((conversation) => (
                                <button
                                  type="button"
                                  key={conversation.id}
                                  onClick={() => forwardToConversation(message.id, conversation.id)}
                                >
                                  {getConversationTitle(
                                    conversation,
                                    members,
                                    currentUserId,
                                    projectName,
                                    {
                                      conversationTitle: t('chat.conversation'),
                                      generalTitle: t('chat.general'),
                                    },
                                  )}
                                </button>
                              ))}
                              {forwardMemberTargets.map((member) => (
                                <button
                                  type="button"
                                  key={member.id}
                                  onClick={() => forwardToMember(message.id, member.id)}
                                >
                                  {member.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {message.replyTo && (
                      <button
                        type="button"
                        className={styles.replyPreview}
                        onClick={() => focusMessage(message.replyTo.id)}
                      >
                        <strong>{replyAuthor || t('chat.conversation')}</strong>
                        <span>
                          {message.replyTo.deletedAt
                            ? t('chat.messageDeleted')
                            : message.replyTo.text}
                        </span>
                      </button>
                    )}
                    {message.forwardedFromMessageId && (
                      <span className={styles.forwardedLabel}>
                        <Forward aria-hidden="true" size={12} /> {t('chat.forwarded')}
                      </span>
                    )}
                    {!hasImageAttachments && hasTextBubble && (
                      <div
                        className={`${styles.bubble} ${isEmojiOnly ? styles.emojiOnlyBubble : ''}`}
                        dir="auto"
                      >
                        {messageBody}
                      </div>
                    )}
                    <MessageAttachments
                      caption={
                        hasImageAttachments && (message.text || editingMessageId === message.id)
                          ? messageBody
                          : null
                      }
                      imageAttachments={imageAttachments}
                      messageId={message.id}
                      otherAttachments={otherAttachments}
                      pendingFiles={message.pendingFiles}
                      onLoad={handleAttachmentLoad}
                      onPreview={setSelectedAttachment}
                    />
                    {!message.deletedAt && message.linkPreviews?.length > 0 && (
                      <div className={styles.linkPreviews}>
                        {message.linkPreviews.map((preview) => (
                          <a key={preview.id} href={preview.url} target="_blank" rel="noreferrer">
                            <span>{preview.siteName || preview.hostname}</span>
                            <strong>{preview.title}</strong>
                            {preview.description && <small>{preview.description}</small>}
                            <ExternalLink aria-hidden="true" size={14} />
                          </a>
                        ))}
                      </div>
                    )}
                    {!message.deletedAt && (
                      <div className={styles.reactions}>
                        {reactions.map((reaction) => (
                          <button
                            type="button"
                            key={reaction.emoji}
                            data-message-id={message.id}
                            data-emoji={reaction.emoji}
                            className={
                              reaction.userIds.includes(currentUserId) ? styles.reacted : ''
                            }
                            onClick={handleReactionClick}
                          >
                            {reaction.emoji} {reaction.userIds.length}
                          </button>
                        ))}
                      </div>
                    )}
                    {(message.editedAt ||
                      message.isPending ||
                      message.isFailed ||
                      message.id === lastReadOwnMessageId) && (
                      <span
                        className={`${styles.meta} ${message.isPending || message.isFailed || message.id === lastReadOwnMessageId ? styles.metaImportant : ''}`}
                      >
                        {message.editedAt && t('chat.edited')}
                        {message.isPending && <SendingStatus label={t('chat.sending')} />}
                        {message.id === lastReadOwnMessageId && (
                          <span
                            className={styles.seenIcon}
                            aria-label={t('chat.seen')}
                            title={t('chat.seen')}
                          >
                            <CheckCheck aria-hidden="true" size={14} strokeWidth={2.25} />
                          </span>
                        )}
                        {message.isFailed && (
                          <button
                            type="button"
                            title={getAttachmentDeliveryErrorMessage(message.error, t)}
                            onClick={() =>
                              dispatch(entryActions.retryChatMessage(message.localId || message.id))
                            }
                          >
                            {t('chat.failedRetryWithReason', {
                              reason: getAttachmentDeliveryErrorMessage(message.error, t),
                            })}
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {typingNames.length > 0 && (
            <div className={styles.typingIndicator}>
              {typingNames.length === 1
                ? t('chat.onePersonTyping', { name: typingNames[0] })
                : t('chat.peopleTyping', { count: typingNames.length })}
            </div>
          )}
        </div>
        {newMessageCount > 0 && (
          <button type="button" className={styles.jumpButton} onClick={scrollToBottom}>
            <ChevronDown aria-hidden="true" size={15} />
            {t('chat.newMessageCount', { count: newMessageCount })}
          </button>
        )}
        {selectedAttachment && (
          <AttachmentPreview
            attachment={selectedAttachment}
            onClose={() => setSelectedAttachment(null)}
          />
        )}
        <AlertDialog
          cancelLabel={t('action.cancel')}
          confirmLabel={t('chat.deleteMessage')}
          description={t('chat.confirmDeleteMessage')}
          open={pendingDeleteMessageId !== null}
          title={t('chat.deleteMessage')}
          tone="danger"
          onCancel={handleDeleteMessageCancel}
          onConfirm={handleDeleteMessageConfirm}
        />
      </div>
    );
  },
);

MessageList.propTypes = {
  conversationId: PropTypes.string.isRequired,
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      isBlocked: PropTypes.bool,
      title: PropTypes.string,
      type: PropTypes.string,
    }),
  ).isRequired,
  currentUserId: PropTypes.string.isRequired,
  hasMore: PropTypes.bool,
  hasMoreAfter: PropTypes.bool,
  initialLastReadMessageId: PropTypes.string,
  initialUnreadCount: PropTypes.number,
  isDirect: PropTypes.bool,
  isFetching: PropTypes.bool,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      createdAt: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
      id: PropTypes.string,
      text: PropTypes.string,
      userId: PropTypes.string,
    }),
  ).isRequired,
  onReadHorizonChange: PropTypes.func,
  otherReadMessageId: PropTypes.string,
  projectId: PropTypes.string.isRequired,
  projectName: PropTypes.string.isRequired,
  typingUserIds: PropTypes.arrayOf(PropTypes.string),
};

MessageList.defaultProps = {
  hasMore: true,
  hasMoreAfter: false,
  initialLastReadMessageId: undefined,
  initialUnreadCount: 0,
  isDirect: false,
  isFetching: false,
  onReadHorizonChange: () => {},
  otherReadMessageId: undefined,
  typingUserIds: [],
};

export default MessageList;
