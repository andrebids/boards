/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Check } from 'lucide-react';
import { Menu } from 'semantic-ui-react';

import selectors from '../../../selectors';
import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(({ id, isActive, onUserSelect, onUserDeselect }) => {
  const selectBoardMembershipById = useMemo(() => selectors.makeSelectBoardMembershipById(), []);
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

  const boardMembership = useSelector((state) => selectBoardMembershipById(state, id));
  const user = useSelector((state) => selectUserById(state, boardMembership.userId));

  const handleToggleClick = useCallback(() => {
    if (isActive) {
      if (onUserDeselect) {
        onUserDeselect(boardMembership.userId);
      }
    } else {
      onUserSelect(boardMembership.userId);
    }
  }, [isActive, onUserSelect, onUserDeselect, boardMembership.userId]);

  return (
    <Menu.Item
      as="button"
      type="button"
      active={isActive}
      role="menuitemcheckbox"
      aria-checked={isActive}
      disabled={!boardMembership.isPersisted}
      className={classNames(styles.menuItem, isActive && styles.menuItemActive)}
      onClick={handleToggleClick}
    >
      <span className={styles.user}>
        <UserAvatar id={boardMembership.userId} />
      </span>
      <div className={styles.menuItemText}>
        <span className={styles.userName}>{user.name}</span>
        {user.username && <span className={styles.userUsername}>@{user.username}</span>}
      </div>
      <span
        aria-hidden="true"
        className={classNames(
          styles.selectionIndicator,
          isActive && styles.selectionIndicatorActive,
        )}
      >
        {isActive && <Check size={14} strokeWidth={2.6} />}
      </span>
    </Menu.Item>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onUserSelect: PropTypes.func.isRequired,
  onUserDeselect: PropTypes.func,
};

Item.defaultProps = {
  onUserDeselect: undefined,
};

export default Item;
