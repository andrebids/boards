import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useChat } from '../ChatContext';
import ChatWindow from '../ChatWindow';

import styles from './ChatDock.module.scss';

const getLimit = (width) => {
  if (width >= 1440) {
    return 3;
  }

  if (width >= 1024) {
    return 2;
  }

  return 1;
};

const ChatDock = React.memo(() => {
  const [t] = useTranslation();
  const { isConversationListOpen, isEnabled, openConversation, windows } = useChat();
  const [limit, setLimit] = useState(() => getLimit(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setLimit(getLimit(window.innerWidth));

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeWindows = useMemo(() => windows.filter((window) => !window.isMinimized), [windows]);

  const { hiddenWindows, visibleWindows } = useMemo(() => {
    const splitIndex = Math.max(0, activeWindows.length - limit);

    return {
      hiddenWindows: activeWindows.slice(0, splitIndex),
      visibleWindows: activeWindows.slice(splitIndex),
    };
  }, [activeWindows, limit]);

  const handleOverflowClick = useCallback(() => {
    const nextWindow = hiddenWindows[hiddenWindows.length - 1];

    if (nextWindow) {
      openConversation(nextWindow.id);
    }
  }, [hiddenWindows, openConversation]);

  if (!isEnabled || activeWindows.length === 0) {
    return null;
  }

  return (
    <aside
      className={`${styles.dock} ${isConversationListOpen ? styles.concealed : ''}`}
      aria-hidden={isConversationListOpen}
      aria-label={t('chat.openConversations')}
    >
      {hiddenWindows.length > 0 && (
        <button
          type="button"
          className={styles.overflowButton}
          title={t('chat.showOtherConversations')}
          onClick={handleOverflowClick}
        >
          <MessageCircle aria-hidden="true" size={17} strokeWidth={2} />
          <span>+{hiddenWindows.length}</span>
        </button>
      )}
      {visibleWindows.map((window) => (
        <ChatWindow key={window.id} id={window.id} />
      ))}
    </aside>
  );
});

export default ChatDock;
