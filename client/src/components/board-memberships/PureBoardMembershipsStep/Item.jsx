/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Check, Pencil } from 'lucide-react';
import { Menu } from 'semantic-ui-react';

import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(
  ({ user, isActive, isAction, isDisabled, onUserSelect, onUserDeselect }) => {
    const handleToggleClick = useCallback(() => {
      if (isActive) {
        if (onUserDeselect) {
          onUserDeselect(user.id);
        }
      } else {
        onUserSelect(user.id);
      }
    }, [isActive, onUserSelect, onUserDeselect, user.id]);

    return (
      <Menu.Item
        as="button"
        type="button"
        active={isActive}
        role={isAction ? 'menuitem' : 'menuitemcheckbox'}
        aria-checked={isAction ? undefined : isActive}
        disabled={isDisabled}
        className={classNames(styles.menuItem, isActive && styles.menuItemActive)}
        onClick={handleToggleClick}
      >
        <span className={styles.user}>
          <UserAvatar id={user.id} />
        </span>
        <div className={styles.menuItemText}>
          <span className={styles.userName}>{user.name || user.username || user.email}</span>
          {user.username && <span className={styles.userUsername}>@{user.username}</span>}
        </div>
        <span
          aria-hidden="true"
          className={classNames(
            styles.selectionIndicator,
            isAction && styles.actionIndicator,
            isActive && styles.selectionIndicatorActive,
          )}
        >
          {isAction ? (
            <Pencil size={16} strokeWidth={2} />
          ) : (
            isActive && <Check size={14} strokeWidth={2.6} />
          )}
        </span>
      </Menu.Item>
    );
  },
);

Item.propTypes = {
  user: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  isActive: PropTypes.bool.isRequired,
  isAction: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onUserSelect: PropTypes.func.isRequired,
  onUserDeselect: PropTypes.func,
};

Item.defaultProps = {
  isAction: false,
  isDisabled: false,
  onUserDeselect: undefined,
};

export default Item;
