/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageCircle, Reply, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { CloseButton } from '../../../lib/custom-ui';
import { useChat } from '../ChatContext';
import ChatAvatar from '../ChatAvatar';
import ChatPanel from '../ChatPanel';
import { getMessageAlertPresentation, getMessagePreviewText } from './preview';

import styles from './ChatLauncher.module.scss';

const CLOSE_ANIMATION_MS = 160;
const PREVIEW_VISIBLE_MS = 4800;
const PREVIEW_EXIT_MS = 160;

const ChatLauncher = React.memo(() => {
  const [t] = useTranslation();
  const unreadTotal = useSelector(selectors.selectChatInboxUnreadConversationTotal) || 0;
  const lastMessageAlert = useSelector(selectors.selectLastChatMessageAlert);
  const alertConversation = useSelector((state) =>
    lastMessageAlert
      ? selectors.selectChatConversationById(state, lastMessageAlert.conversationId)
      : undefined,
  );
  const alertInboxItem = useSelector((state) =>
    lastMessageAlert
      ? selectors
          .selectChatInboxItems(state)
          .find(({ conversationId }) => conversationId === lastMessageAlert.conversationId)
      : undefined,
  );
  const alertSender = useSelector((state) =>
    lastMessageAlert?.senderUserId
      ? selectors.selectUserById(state, lastMessageAlert.senderUserId)
      : undefined,
  );
  const {
    closeConversationList,
    inboxScope,
    isConversationListClosing,
    isConversationListOpen,
    isEnabled,
    openGlobalConversation,
    openConversationList,
    setInboxScope,
    startConversationListClose,
    windows,
  } = useChat();
  const [isAlerting, setIsAlerting] = useState(false);
  const [previewAlert, setPreviewAlert] = useState(null);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);
  const alertTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const closeCompletionRef = useRef(null);
  const handledAlertMessageIdRef = useRef(null);
  const handledPreviewMessageIdRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const previewExitTimeoutRef = useRef(null);

  const clearPreviewTimers = useCallback(() => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (previewExitTimeoutRef.current) {
      window.clearTimeout(previewExitTimeoutRef.current);
      previewExitTimeoutRef.current = null;
    }
  }, []);

  const dismissPreview = useCallback(() => {
    clearPreviewTimers();
    setIsPreviewClosing(true);
    previewExitTimeoutRef.current = window.setTimeout(() => {
      setPreviewAlert(null);
      setIsPreviewClosing(false);
      previewExitTimeoutRef.current = null;
    }, PREVIEW_EXIT_MS);
  }, [clearPreviewTimers]);

  const schedulePreviewDismiss = useCallback(() => {
    clearPreviewTimers();
    previewTimeoutRef.current = window.setTimeout(dismissPreview, PREVIEW_VISIBLE_MS);
  }, [clearPreviewTimers, dismissPreview]);

  useEffect(() => {
    const presentation = getMessageAlertPresentation(
      lastMessageAlert,
      handledAlertMessageIdRef.current,
      windows,
      false,
    );
    if (!presentation.isNew) {
      return undefined;
    }

    handledAlertMessageIdRef.current = presentation.messageId;
    if (!presentation.isEligible) {
      return undefined;
    }

    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
    }
    setIsAlerting(true);
    alertTimeoutRef.current = window.setTimeout(() => {
      setIsAlerting(false);
      alertTimeoutRef.current = null;
    }, 1600);
    return undefined;
  }, [lastMessageAlert, windows]);

  useEffect(() => {
    const presentation = getMessageAlertPresentation(
      lastMessageAlert,
      handledPreviewMessageIdRef.current,
      windows,
      isConversationListOpen,
    );

    if (presentation.isNew) {
      handledPreviewMessageIdRef.current = presentation.messageId;
    }

    if (!presentation.isEligible) {
      clearPreviewTimers();
      setPreviewAlert(null);
      setIsPreviewClosing(false);
      return undefined;
    }

    if (!presentation.shouldPresent) {
      return undefined;
    }

    setPreviewAlert(lastMessageAlert);
    setIsPreviewClosing(false);
    schedulePreviewDismiss();

    return undefined;
  }, [
    clearPreviewTimers,
    isConversationListOpen,
    lastMessageAlert,
    schedulePreviewDismiss,
    windows,
  ]);

  useEffect(
    () => () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      clearPreviewTimers();
      closeCompletionRef.current = null;
    },
    [clearPreviewTimers],
  );

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    closeCompletionRef.current = null;
    openConversationList();
  }, [openConversationList]);

  const finishClose = useCallback(() => {
    closeConversationList();
    closeTimeoutRef.current = null;

    const onClosed = closeCompletionRef.current;
    closeCompletionRef.current = null;
    onClosed?.();
  }, [closeConversationList]);

  const handleClose = useCallback(
    (onClosed) => {
      if (typeof onClosed === 'function') {
        closeCompletionRef.current = onClosed;
      }

      if (isConversationListClosing || closeTimeoutRef.current) {
        return;
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishClose();
        return;
      }

      startConversationListClose();
      closeTimeoutRef.current = window.setTimeout(finishClose, CLOSE_ANIMATION_MS);
    },
    [finishClose, isConversationListClosing, startConversationListClose],
  );

  const handleToggle = useCallback(() => {
    if (isConversationListOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [handleClose, handleOpen, isConversationListOpen]);

  const handlePreviewOpen = useCallback(() => {
    if (!previewAlert) {
      return;
    }

    dismissPreview();
    openGlobalConversation({
      conversationId: previewAlert.conversationId,
      firstUnreadMessageId: previewAlert.messageId,
      projectId: previewAlert.projectId,
    });
  }, [dismissPreview, openGlobalConversation, previewAlert]);

  const handlePreviewReply = useCallback(() => {
    if (!previewAlert) {
      return;
    }

    dismissPreview();
    openGlobalConversation({
      conversationId: previewAlert.conversationId,
      firstUnreadMessageId: previewAlert.messageId,
      projectId: previewAlert.projectId,
      reply: true,
    });
  }, [dismissPreview, openGlobalConversation, previewAlert]);

  if (!isEnabled) {
    return null;
  }

  const isPanelExpanded = isConversationListOpen && !isConversationListClosing;
  let launcherLabel = t('chat.openConversations');
  if (isConversationListOpen) {
    launcherLabel = t('chat.closeConversations');
  } else if (unreadTotal > 0) {
    launcherLabel = t('chat.conversationsWithUnread', { count: unreadTotal });
  }

  const previewLastMessage = alertConversation?.lastMessage || alertInboxItem?.lastMessage;
  const previewSenderName = alertSender?.name || alertInboxItem?.title || t('chat.conversation');
  const previewText = getMessagePreviewText(previewLastMessage, t);
  const previewConversationTitle = alertInboxItem?.title || t('chat.conversation');
  const previewContext = [
    previewConversationTitle !== previewSenderName ? previewConversationTitle : null,
    alertInboxItem?.projectName,
  ]
    .filter(Boolean)
    .join(' · ');
  const previewUnreadCount = Math.max(
    alertConversation?.unreadCount || 0,
    alertInboxItem?.unreadCount || 0,
    1,
  );
  const previewAvatarUser = alertSender || { name: previewSenderName };

  return (
    <>
      {isConversationListOpen && (
        <ChatPanel
          inboxScope={inboxScope}
          isClosing={isConversationListClosing}
          onClose={handleClose}
          onInboxScopeChange={setInboxScope}
          onOpenGlobalConversation={openGlobalConversation}
        />
      )}
      {previewAlert && (
        <aside
          className={`${styles.messagePreview} ${
            isPreviewClosing ? styles.messagePreviewClosing : ''
          }`}
          aria-label={t('chat.newMessageAlert')}
          aria-live="polite"
          onBlur={schedulePreviewDismiss}
          onFocus={clearPreviewTimers}
          onMouseEnter={clearPreviewTimers}
          onMouseLeave={schedulePreviewDismiss}
        >
          <header className={styles.previewHeader}>
            <span className={styles.previewAppMark} aria-hidden="true">
              <MessageCircle size={15} strokeWidth={2.2} />
            </span>
            <strong>Boards</strong>
            <span>{t('chat.newMessageAlert')}</span>
          </header>
          <CloseButton
            ariaLabel={t('chat.close')}
            className={styles.previewDismiss}
            onClick={dismissPreview}
            title={t('chat.close')}
          />
          <button
            type="button"
            className={styles.previewOpen}
            aria-label={`${previewSenderName}: ${previewText}`}
            onClick={handlePreviewOpen}
          >
            <ChatAvatar user={previewAvatarUser} isOnline={alertSender?.isOnline} />
            <span className={styles.previewCopy}>
              <span className={styles.previewTitleLine}>
                <strong>{previewSenderName}</strong>
                <span>{previewContext}</span>
              </span>
              <span className={styles.previewMessage}>{previewText}</span>
            </span>
          </button>
          <footer className={styles.previewActions}>
            <button type="button" className={styles.previewReply} onClick={handlePreviewReply}>
              <Reply aria-hidden="true" size={15} strokeWidth={2} />
              {t('chat.reply')}
            </button>
            <button type="button" className={styles.previewSecondary} onClick={handlePreviewOpen}>
              {t('chat.openConversation')}
            </button>
            <span
              className={styles.previewUnread}
              aria-label={t('chat.unreadMessages', {
                count: previewUnreadCount,
              })}
            >
              {previewUnreadCount > 99 ? '99+' : previewUnreadCount}
            </span>
          </footer>
        </aside>
      )}
      <button
        type="button"
        aria-controls="chat-conversation-panel"
        aria-expanded={isConversationListOpen}
        aria-label={launcherLabel}
        title={launcherLabel}
        className={`${styles.launcher} ${isPanelExpanded ? styles.expanded : ''} ${unreadTotal > 0 ? styles.hasUnread : ''} ${isAlerting ? styles.alerting : ''}`}
        onClick={handleToggle}
      >
        <span className={styles.iconStack} aria-hidden="true">
          <MessageCircle className={styles.messageIcon} size={22} strokeWidth={2} />
          <X className={styles.closeIcon} size={22} strokeWidth={1.5} />
        </span>
        {unreadTotal > 0 && <span className={styles.badge}>{Math.min(unreadTotal, 99)}</span>}
        {isAlerting && <span className={styles.alertStatus}>{t('chat.newMessageAlert')}</span>}
      </button>
    </>
  );
});

export default ChatLauncher;
