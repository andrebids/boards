import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ChatAvatar from '../ChatAvatar';

import styles from './MemberRow.module.scss';

const MemberRow = React.memo(({ isPending, member, onClick }) => {
  const [t] = useTranslation();

  return (
    <button
      type="button"
      data-id={member.id}
      className={styles.row}
      disabled={isPending}
      onClick={(event) => onClick(event.currentTarget.dataset.id)}
    >
      <ChatAvatar user={member} isOnline={member.isOnline} />
      <span className={styles.copy}>
        <strong>{member.name}</strong>
        <small>
          {member.isOnline ? t('chat.available') : member.username || t('chat.memberOfProject')}
        </small>
      </span>
    </button>
  );
});

MemberRow.propTypes = {
  isPending: PropTypes.bool.isRequired,
  member: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    username: PropTypes.string,
    isOnline: PropTypes.bool,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default MemberRow;
