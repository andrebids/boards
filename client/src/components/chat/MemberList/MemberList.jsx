import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import MemberRow from '../MemberRow';

import styles from './MemberList.module.scss';

const MemberList = React.memo(({ isPending, members, onMemberOpen }) => {
  const [t] = useTranslation();

  return (
    <div className={styles.list} role="tabpanel" aria-labelledby="chat-tab-members">
      {members.map((member) => (
        <MemberRow key={member.id} member={member} isPending={isPending} onClick={onMemberOpen} />
      ))}
      {members.length === 0 && <div className={styles.empty}>{t('chat.noMembersFound')}</div>}
    </div>
  );
});

MemberList.propTypes = {
  isPending: PropTypes.bool.isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onMemberOpen: PropTypes.func.isRequired,
};

export default MemberList;
