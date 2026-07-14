/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { useChat } from '../ChatContext';
import ChatPanel from '../ChatPanel';

import styles from './ChatLauncher.module.scss';

const CLOSE_ANIMATION_MS = 160;

const ChatLauncher = React.memo(() => {
  const [t] = useTranslation();
  const unreadTotal = useSelector(selectors.selectChatUnreadTotal) || 0;
  const lastMessageAlert = useSelector(selectors.selectLastChatMessageAlert);
  const {
    closeConversationList,
    isConversationListOpen,
    isEnabled,
    openConversationList,
    windows,
  } = useChat();
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [isAlerting, setIsAlerting] = useState(false);
  const closeTimeoutRef = useRef(null);
  const closeCompletionRef = useRef(null);

  useEffect(() => {
    if (!lastMessageAlert || windows.some(({ id }) => id === lastMessageAlert.conversationId)) {
      return undefined;
    }

    setIsAlerting(true);
    const timeoutId = window.setTimeout(() => setIsAlerting(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [lastMessageAlert, windows]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      closeCompletionRef.current = null;
    },
    [],
  );

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    closeCompletionRef.current = null;
    setIsPanelClosing(false);
    openConversationList();
  }, [openConversationList]);

  const finishClose = useCallback(() => {
    closeConversationList();
    setIsPanelClosing(false);
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

      if (isPanelClosing || closeTimeoutRef.current) {
        return;
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishClose();
        return;
      }

      setIsPanelClosing(true);
      closeTimeoutRef.current = window.setTimeout(finishClose, CLOSE_ANIMATION_MS);
    },
    [finishClose, isPanelClosing],
  );

  const handleToggle = useCallback(() => {
    if (isConversationListOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [handleClose, handleOpen, isConversationListOpen]);

  if (!isEnabled) {
    return null;
  }

  const isPanelExpanded = isConversationListOpen && !isPanelClosing;
  let launcherLabel = t('chat.openConversations');
  if (isConversationListOpen) {
    launcherLabel = t('chat.closeConversations');
  } else if (unreadTotal > 0) {
    launcherLabel = t('chat.conversationsWithUnread', { count: unreadTotal });
  }

  return (
    <>
      {isConversationListOpen && <ChatPanel isClosing={isPanelClosing} onClose={handleClose} />}
      <button
        type="button"
        aria-controls="chat-conversation-panel"
        aria-expanded={isConversationListOpen}
        aria-label={launcherLabel}
        title={launcherLabel}
        className={`${styles.launcher} ${isPanelExpanded ? styles.expanded : ''} ${isAlerting ? styles.alerting : ''}`}
        onClick={handleToggle}
      >
        <span className={styles.iconStack} aria-hidden="true">
          <MessageCircle className={styles.messageIcon} size={22} strokeWidth={2} />
          <X className={styles.closeIcon} size={22} strokeWidth={2} />
        </span>
        {unreadTotal > 0 && <span className={styles.badge}>{Math.min(unreadTotal, 99)}</span>}
        {isAlerting && <span className={styles.alertStatus}>{t('chat.newMessageAlert')}</span>}
      </button>
    </>
  );
});

export default ChatLauncher;
