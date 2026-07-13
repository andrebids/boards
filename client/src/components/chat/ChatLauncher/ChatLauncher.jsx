/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import { useChat } from '../ChatContext';
import ChatPanel from '../ChatPanel';

import styles from './ChatLauncher.module.scss';

const CLOSE_ANIMATION_MS = 180;

const ChatLauncher = React.memo(() => {
  const [t] = useTranslation();
  const unreadTotal = useSelector(selectors.selectChatUnreadTotal) || 0;
  const { closeConversationList, isConversationListOpen, isEnabled, openConversationList } =
    useChat();
  const [isPanelClosing, setIsPanelClosing] = useState(false);

  const handleOpen = useCallback(() => {
    setIsPanelClosing(false);
    openConversationList();
  }, [openConversationList]);

  const handleClose = useCallback(() => {
    setIsPanelClosing(true);
    window.setTimeout(() => {
      closeConversationList();
      setIsPanelClosing(false);
    }, CLOSE_ANIMATION_MS);
  }, [closeConversationList]);

  if (!isEnabled) {
    return null;
  }

  return isConversationListOpen ? (
    <ChatPanel isClosing={isPanelClosing} onClose={handleClose} />
  ) : (
    <button
      type="button"
      aria-label={
        unreadTotal > 0
          ? t('chat.conversationsWithUnread', { count: unreadTotal })
          : t('chat.openConversations')
      }
      title={t('chat.openConversations')}
      className={styles.launcher}
      onClick={handleOpen}
    >
      <MessageCircle aria-hidden="true" size={22} strokeWidth={2} />
      {unreadTotal > 0 && <span className={styles.badge}>{Math.min(unreadTotal, 99)}</span>}
    </button>
  );
});

export default ChatLauncher;
