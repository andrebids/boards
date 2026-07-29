/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import UserAvatar from '../../users/UserAvatar';

import styles from './CardMembers.module.scss';

const MAX_VISIBLE_MEMBERS = 3;

const CardMembers = React.memo(({ userIds, creatorUserId, withCreator }) => {
  const members = [
    ...(withCreator && creatorUserId
      ? [
          {
            id: creatorUserId,
            isCreator: true,
          },
        ]
      : []),
    ...userIds.map((id) => ({
      id,
      isCreator: false,
    })),
  ];

  if (members.length === 0) {
    return null;
  }

  const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembersTotal = members.length - visibleMembers.length;

  return (
    <span className={styles.wrapper}>
      {visibleMembers.map(({ id, isCreator }) => (
        <span key={`${isCreator ? 'creator' : 'member'}:${id}`} className={styles.member}>
          <UserAvatar
            id={id}
            size="tiny"
            withCreatorIndicator={isCreator}
            className={styles.avatar}
          />
        </span>
      ))}
      {hiddenMembersTotal > 0 && <span className={styles.overflow}>+{hiddenMembersTotal}</span>}
    </span>
  );
});

CardMembers.propTypes = {
  userIds: PropTypes.arrayOf(PropTypes.string),
  creatorUserId: PropTypes.string,
  withCreator: PropTypes.bool,
};

CardMembers.defaultProps = {
  userIds: [],
  creatorUserId: undefined,
  withCreator: false,
};

export default CardMembers;
