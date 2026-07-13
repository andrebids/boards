import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import styles from './ChatHeader.module.scss';

const ChatHeader = React.memo(({ memberCount, projectName, onClose }) => {
  const [t] = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <span className={styles.project}>{projectName || t('chat.project')}</span>
        <div className={styles.titleRow}>
          <h2>{t('chat.conversations')}</h2>
          <span>{t('chat.memberCount', { count: memberCount })}</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        aria-label={t('chat.closeConversations')}
        onClick={onClose}
      >
        <X aria-hidden="true" size={20} strokeWidth={2} />
      </button>
    </header>
  );
});

ChatHeader.propTypes = {
  memberCount: PropTypes.number.isRequired,
  projectName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

ChatHeader.defaultProps = { projectName: undefined };

export default ChatHeader;
