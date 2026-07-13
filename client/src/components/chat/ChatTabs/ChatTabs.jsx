import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import styles from './ChatTabs.module.scss';

const ChatTabs = React.memo(({ activeTab, onChange }) => {
  const [t] = useTranslation();
  const tabs = [
    { id: 'conversations', label: t('chat.conversations') },
    { id: 'members', label: t('chat.members') },
    { id: 'saved', label: t('chat.saved') },
  ];

  return (
    <div className={styles.tabs} role="tablist" aria-label={t('chat.conversationsNavigation')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`chat-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? styles.active : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

ChatTabs.propTypes = {
  activeTab: PropTypes.oneOf(['conversations', 'members', 'saved']).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ChatTabs;
