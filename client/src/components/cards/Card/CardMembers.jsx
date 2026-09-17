/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import UserAvatar from '../../users/UserAvatar';

import styles from './CardMembers.module.scss';

const MAX_VISIBLE_MEMBERS = 3;

const CardMembers = React.memo(({ userIds, creatorUserId, withCreator, fallbackUsersById }) => {
  const isCreatorVisible = withCreator && !!creatorUserId;

  if (!isCreatorVisible && userIds.length === 0) {
    return null;
  }

  const visibleUserIds = userIds.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembersTotal = userIds.length - visibleUserIds.length;

  return (
    <span className={styles.wrapper}>
      {isCreatorVisible && (
        <>
          <span className={styles.member}>
            <UserAvatar
              id={creatorUserId}
              fallbackUser={fallbackUsersById[creatorUserId]}
              size="tiny"
              withCreatorIndicator
              className={styles.avatar}
            />
          </span>
          {userIds.length > 0 && <span className={styles.creatorDivider} />}
        </>
      )}
      {visibleUserIds.map((id) => (
        <span key={id} className={styles.member}>
          <UserAvatar
            id={id}
            fallbackUser={fallbackUsersById[id]}
            size="tiny"
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
  /* eslint-disable-next-line react/forbid-prop-types */
  fallbackUsersById: PropTypes.object,
};

CardMembers.defaultProps = {
  userIds: [],
  creatorUserId: undefined,
  withCreator: false,
  fallbackUsersById: {},
};

export default CardMembers;
