import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import styles from './ChatTabs.module.scss';

const ChatTabs = React.memo(({ activeTab, onChange }) => {
  const [t] = useTranslation();
  const tabs = [
    { id: 'conversations', label: t('chat.conversations') },
    { id: 'members', label: t('chat.members') },
  ];

  return (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label={t('chat.conversationsNavigation')}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`chat-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-controls={`chat-tabpanel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={activeTab === tab.id ? styles.active : ''}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (
              !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
            ) {
              return;
            }

            event.preventDefault();
            let nextIndex = index;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;
            if (event.key === 'ArrowLeft')
              nextIndex = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'ArrowRight')
              nextIndex = (index + 1) % tabs.length;
            onChange(tabs[nextIndex].id);
            document.getElementById(`chat-tab-${tabs[nextIndex].id}`)?.focus();
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

ChatTabs.propTypes = {
  activeTab: PropTypes.oneOf(['conversations', 'members']).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ChatTabs;
