import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import MemberRow from '../MemberRow';

import styles from './MemberList.module.scss';

const MemberList = React.memo(({ isCompact, isPending, members, onMemberOpen }) => {
  const [t] = useTranslation();

  return (
    <div className={`${styles.list} ${isCompact ? styles.compact : ''}`}>
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          isPending={isPending}
          onClick={onMemberOpen}
        />
      ))}
      {members.length === 0 && (
        <div className={styles.empty}>{t('chat.noMembersFound')}</div>
      )}
    </div>
  );
});

MemberList.propTypes = {
  isCompact: PropTypes.bool,
  isPending: PropTypes.bool.isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onMemberOpen: PropTypes.func.isRequired,
};

MemberList.defaultProps = {
  isCompact: false,
};

export default MemberList;
