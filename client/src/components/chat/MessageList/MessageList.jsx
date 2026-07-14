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
  ChevronDown,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Forward,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Quote,
  Reply,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import UserAvatar from '../../users/UserAvatar';
import Config from '../../../constants/Config';
import LazyEmojiPicker from '../LazyEmojiPicker';
import { getConversationTitle } from '../utils';

import styles from './MessageList.module.scss';

const formatTime = (value) =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );

const formatDay = (value) =>
  new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const isSameDay = (first, second) => {
  const firstDate = new Date(first);
  const secondDate = new Date(second);
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
};

const compareNumericIds = (left, right) => {
  if (!left || !right) return 0;
  const normalizedLeft = String(left).replace(/^0+/, '');
  const normalizedRight = String(right).replace(/^0+/, '');
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }
  return normalizedLeft.localeCompare(normalizedRight);
};

const REACTION_EMOJI_PICKER_WIDTH = 250;
const REACTION_EMOJI_PICKER_HEIGHT = 270;
const FLOATING_PICKER_MARGIN = 12;

const getReactionEmojiPickerPosition = (element) => {
  const rect = element.getBoundingClientRect();
  const maximumLeft = Math.max(
    FLOATING_PICKER_MARGIN,
    window.innerWidth - REACTION_EMOJI_PICKER_WIDTH - FLOATING_PICKER_MARGIN,
  );
  const preferredTop = rect.top - REACTION_EMOJI_PICKER_HEIGHT - 8;
  const top =
    preferredTop >= FLOATING_PICKER_MARGIN
      ? preferredTop
      : Math.min(
          window.innerHeight - REACTION_EMOJI_PICKER_HEIGHT - FLOATING_PICKER_MARGIN,
          rect.bottom + 8,
        );
  return {
    left: Math.min(Math.max(FLOATING_PICKER_MARGIN, rect.left), maximumLeft),
    top: Math.max(FLOATING_PICKER_MARGIN, top),
  };
};

const renderMessageText = (text) => {
  const parts = String(text).split(/(@\[[^\]]+\]\([^)]*\))/g);
  let offset = 0;
  return parts.map((part) => {
    const partOffset = offset;
    offset += part.length;
    const match = part.match(/^@\[([^\]]+)\]\([^)]*\)$/);
    return match ? (
      <span key={`${match[1]}-${partOffset}`} className={styles.mention}>
        @{match[1]}
      </span>
    ) : (
      part
    );
  });
};

function AttachmentPreview({ attachment, onClose }) {
  const [t] = useTranslation();
  const url = attachment.data?.url;
  const mimeType = attachment.data?.mimeType || '';
  const isImage = !!attachment.data?.image;
  const isVideo = !!attachment.data?.video || mimeType.startsWith('video/');
  const isPdf = mimeType === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.previewBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={attachment.name}
        className={styles.previewDialog}
      >
        <header>
          <strong>{attachment.name}</strong>
          <span>
            <a href={url} target="_blank" rel="noreferrer" aria-label={t('chat.downloadFile')}>
              <Download aria-hidden="true" size={17} />
            </a>
            <button type="button" aria-label={t('chat.close')} onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </button>
          </span>
        </header>
        <div className={styles.previewBody}>
          {isImage && <img src={url} alt={attachment.name} />}
          {/* User uploads do not have a separate captions track. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          {isVideo && <video src={url} controls preload="metadata" />}
          {isPdf && <iframe src={url} title={attachment.name} />}
          {!isImage && !isVideo && !isPdf && (
            <div className={styles.genericPreview}>
              <FileText aria-hidden="true" size={42} strokeWidth={1.5} />
              <span>{t('chat.previewUnavailable')}</span>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.getElementById('app') || document.body,
  );
}

AttachmentPreview.propTypes = {
  attachment: PropTypes.shape({
    name: PropTypes.string.isRequired,
    data: PropTypes.shape({
      url: PropTypes.string,
      mimeType: PropTypes.string,
      image: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
      video: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
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
    otherReadMessageId,
    projectId,
    projectName,
    typingUserIds,
  }) => {
    const [t] = useTranslation();
    const listRef = useRef(null);
    const activeMessageActionsRef = useRef(null);
    const previousLastIdRef = useRef(null);
    const prependScrollStateRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const [activeReactionMenuMessageId, setActiveReactionMenuMessageId] = useState(null);
    const [activeActionsMessageId, setActiveActionsMessageId] = useState(null);
    const [forwardingMessageId, setForwardingMessageId] = useState(null);
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
          compareNumericIds(message.id, otherReadMessageId) <= 0
            ? message.id
            : result,
        null,
      );
    }, [currentUserId, isDirect, messages, otherReadMessageId]);

    const typingNames = useMemo(
      () =>
        typingUserIds
          .filter((id) => id !== currentUserId)
          .map((id) => members.find((member) => member.id === id)?.name)
          .filter(Boolean),
      [currentUserId, members, typingUserIds],
    );

    const scrollToBottom = useCallback(() => {
      const list = listRef.current;
      if (list) {
        list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        isAtBottomRef.current = true;
        setNewMessageCount(0);
      }
    }, []);

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
        if (isAtBottomRef.current) {
          list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
        } else {
          setNewMessageCount((count) => count + 1);
        }
      }
      previousLastIdRef.current = lastMessage.id;
    }, [focusedMessageId, messages]);

    const handleScroll = useCallback(
      (event) => {
        const list = event.currentTarget;
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
          prependScrollStateRef.current = { height: list.scrollHeight, top: list.scrollTop };
          dispatch(entryActions.fetchChatMessages(conversationId));
        }
      },
      [conversationId, dispatch, hasMore, hasMoreAfter, isFetching, messages],
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
          // Keep deletion behind an explicit native confirmation.
          // eslint-disable-next-line no-alert
          if (window.confirm(t('chat.confirmDeleteMessage'))) {
            dispatch(entryActions.deleteChatMessage(message.id));
          }
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

    const handleReactionMenuToggle = useCallback((event) => {
      const { messageId } = event.currentTarget.dataset;
      if (activeReactionMenuMessageId === messageId) {
        setActiveReactionMenuMessageId(null);
        setIsReactionEmojiPickerOpen(false);
        setReactionEmojiPickerPosition(null);
        return;
      }

      setActiveReactionMenuMessageId(messageId);
      setReactionEmojiPickerPosition(getReactionEmojiPickerPosition(event.currentTarget));
      setIsReactionEmojiPickerOpen(true);
    }, [activeReactionMenuMessageId]);

    const chooseReaction = useCallback(
      (messageId, emoji) => {
        dispatch(entryActions.toggleChatMessageReaction(messageId, emoji));
        setActiveReactionMenuMessageId(null);
        setIsReactionEmojiPickerOpen(false);
      },
      [dispatch],
    );

    useEffect(() => {
      if (!isReactionEmojiPickerOpen) return undefined;
      const close = () => {
        setActiveReactionMenuMessageId(null);
        setIsReactionEmojiPickerOpen(false);
        setReactionEmojiPickerPosition(null);
      };
      window.addEventListener('resize', close);
      window.addEventListener('scroll', close, true);
      return () => {
        window.removeEventListener('resize', close);
        window.removeEventListener('scroll', close, true);
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
            const startsNewDay =
              !previousMessage || !isSameDay(previousMessage.createdAt, message.createdAt);
            const isOwn = message.userId === currentUserId;
            const continuesPrevious =
              previousMessage &&
              previousMessage.userId === message.userId &&
              !startsNewDay &&
              new Date(message.createdAt) - new Date(previousMessage.createdAt) < 5 * 60 * 1000;
            const continuesNext =
              nextMessage &&
              nextMessage.userId === message.userId &&
              isSameDay(message.createdAt, nextMessage.createdAt) &&
              new Date(nextMessage.createdAt) - new Date(message.createdAt) < 5 * 60 * 1000;
            const reactions = message.reactions || [];
            const replyAuthor = members.find(({ id }) => id === message.replyTo?.userId)?.name;
            const messageAttachments = message.deletedAt ? [] : message.attachments || [];
            const imageAttachments = messageAttachments.filter(
              (attachment) => attachment.data?.image,
            );
            const otherAttachments = messageAttachments.filter(
              (attachment) => !attachment.data?.image,
            );
            const hasImageAttachments = imageAttachments.length > 0;
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
                      <X aria-hidden="true" size={14} />
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
                  {renderMessageText(message.text)}
                </LinkifyReact>
              );
            }

            return (
              <React.Fragment key={message.id || message.localId}>
                {startsNewDay && (
                  <div className={styles.dayDivider}>
                    <span>{formatDay(message.createdAt)}</span>
                  </div>
                )}
                {index === unreadStartIndex && (
                  <div className={styles.unreadDivider}>{t('chat.newMessages')}</div>
                )}
                <div
                  data-message-id={message.id}
                  className={`${styles.messageRow} ${isOwn ? styles.own : ''} ${
                    continuesPrevious ? styles.continuesPrevious : ''
                  } ${continuesNext ? styles.continuesNext : ''} ${
                    focusedMessageId === message.id ? styles.focusedMessage : ''
                  }`}
                >
                  {!isOwn && !continuesNext && <UserAvatar id={message.userId} size="tiny" />}
                  {!isOwn && continuesNext && <span className={styles.avatarSpacer} />}
                  <div className={styles.messageContent}>
                    {!continuesPrevious && (
                      <span className={styles.groupTime}>{formatTime(message.createdAt)}</span>
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
                        {['👍', '❤️', '😂', '😮'].map((emoji) => (
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
                                style={reactionEmojiPickerPosition}
                              >
                                <Suspense fallback={null}>
                                  <LazyEmojiPicker
                                    className={styles.reactionEmojiPicker}
                                    theme="dark"
                                    width={250}
                                    height={270}
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
                            activeActionsMessageId === message.id || forwardingMessageId === message.id
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
                              <button
                                type="button"
                                onClick={() => handleMessageAction('reply', message)}
                              >
                                <Reply aria-hidden="true" size={14} /> {t('chat.reply')}
                              </button>
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
                              {conversations
                                .filter(
                                  (conversation) =>
                                    conversation.id !== conversationId && !conversation.isBlocked,
                                )
                                .map((conversation) => (
                                  <button
                                    type="button"
                                    key={conversation.id}
                                    onClick={() => {
                                      dispatch(
                                        entryActions.forwardChatMessage(message.id, conversation.id),
                                      );
                                      closeMenus();
                                    }}
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
                    {hasImageAttachments ? (
                      <div className={styles.imageMessage}>
                        <div
                          className={`${styles.imageGallery} ${
                            imageAttachments.length > 1 ? styles.imageGalleryMultiple : ''
                          }`}
                        >
                          {imageAttachments.map((attachment) => {
                            const url =
                              attachment.data?.url ||
                              `${Config.SERVER_BASE_URL}/api/chat-message-attachments/${attachment.id}/download`;
                            const previewUrl =
                              attachment.data?.thumbnailUrls?.outside360 || url;
                            return (
                              <button
                                type="button"
                                key={attachment.id}
                                className={styles.imageAttachment}
                                aria-label={attachment.name}
                                onClick={() =>
                                  setSelectedAttachment({
                                    ...attachment,
                                    data: { ...attachment.data, url },
                                  })
                                }
                              >
                                <img src={previewUrl} alt={attachment.name} />
                              </button>
                            );
                          })}
                        </div>
                        {(message.text || editingMessageId === message.id) && (
                          <div className={`${styles.bubble} ${styles.imageCaption}`} dir="auto">
                            {messageBody}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.bubble} dir="auto">
                        {messageBody}
                      </div>
                    )}
                    {otherAttachments.length > 0 && (
                      <div className={styles.attachments}>
                        {otherAttachments.map((attachment) => {
                          const url =
                            attachment.data?.url ||
                            `${Config.SERVER_BASE_URL}/api/chat-message-attachments/${attachment.id}/download`;
                          const thumbnailUrl = attachment.data?.thumbnailUrls?.outside360;
                          const isVisualPreview =
                            attachment.data?.image ||
                            attachment.data?.video ||
                            attachment.data?.mimeType === 'application/pdf';
                          let attachmentIcon = <Paperclip aria-hidden="true" size={14} />;
                          if (thumbnailUrl) {
                            attachmentIcon = <img src={thumbnailUrl} alt="" />;
                          } else if (attachment.data?.image) {
                            attachmentIcon = <ImageIcon aria-hidden="true" size={14} />;
                          }
                          return (
                            <button
                              type="button"
                              key={attachment.id}
                              className={`${styles.attachment} ${thumbnailUrl ? styles.attachmentVisual : ''}`}
                              onClick={() => {
                                if (isVisualPreview) {
                                  setSelectedAttachment({
                                    ...attachment,
                                    data: { ...attachment.data, url },
                                  });
                                } else {
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              {attachmentIcon}
                              <span>{attachment.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                        {message.isPending && t('chat.sending')}
                        {message.id === lastReadOwnMessageId && (
                          <span
                            className={styles.seenIcon}
                            aria-label={t('chat.seen')}
                            title={t('chat.seen')}
                          >
                            <Eye aria-hidden="true" size={12} strokeWidth={2} />
                          </span>
                        )}
                        {message.isFailed && (
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(entryActions.retryChatMessage(message.localId || message.id))
                            }
                          >
                            {t('chat.failedRetry')}
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
    PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  ).isRequired,
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      createdAt: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
      id: PropTypes.string,
      text: PropTypes.string,
      userId: PropTypes.string,
    }),
  ).isRequired,
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
  otherReadMessageId: undefined,
  typingUserIds: [],
};

export default MessageList;
