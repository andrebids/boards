import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { CloseButton } from '../../../lib/custom-ui';

import styles from './ChatHeader.module.scss';

const ChatHeader = React.memo(({ memberCount, meta, projectName, title, onClose }) => {
  const [t] = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <h2>{title || t('chat.conversations')}</h2>
        <p>
          {meta ? (
            <span>{meta}</span>
          ) : (
            <>
              <span>{projectName || t('chat.project')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('chat.memberCount', { count: memberCount })}</span>
            </>
          )}
        </p>
      </div>
      <CloseButton ariaLabel={t('chat.closeConversations')} onClick={onClose} />
    </header>
  );
});

ChatHeader.propTypes = {
  memberCount: PropTypes.number.isRequired,
  meta: PropTypes.string,
  projectName: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

ChatHeader.defaultProps = {
  meta: undefined,
  projectName: undefined,
  title: undefined,
};

export default ChatHeader;
