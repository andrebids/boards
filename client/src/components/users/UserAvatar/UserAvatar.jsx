/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import initials from 'initials';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { Popup } from '../../../lib/custom-ui';
import selectors from '../../../selectors';
import { StaticUserIds } from '../../../constants/StaticUsers';

import styles from './UserAvatar.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  MASSIVE: 'massive',
};

const Variants = {
  DEFAULT: 'default',
  BOARD: 'board',
};

const COLORS = ['blue', 'green', 'purple', 'orange', 'aqua', 'magenta', 'sunset', 'indigo', 'lime'];

const getColor = (name) => {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) {
    sum += name.charCodeAt(i);
  }

  return COLORS[sum % COLORS.length];
};

const UserAvatar = React.memo(
  ({ id, size, variant, isDisabled, withCreatorIndicator, className, onClick }) => {
    const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

    const user = useSelector((state) => selectUserById(state, id));
    const [t] = useTranslation();
    const title =
      user.id === StaticUserIds.DELETED
        ? t(`common.${user.name}`, {
            context: 'title',
          })
        : user.name;
    const hasBoardTooltip = variant === Variants.BOARD;

    const avatarNode = (
      <span
        className={classNames(
          styles.wrapper,
          styles[`wrapper${upperFirst(size)}`],
          variant === Variants.BOARD && styles.wrapperBoard,
          onClick && styles.wrapperHoverable,
          !user.avatar && styles[`background${upperFirst(camelCase(getColor(user.name)))}`],
        )}
        style={{
          background: user.avatar && `url("${user.avatar.thumbnailUrls.cover180}") center / cover`,
        }}
        title={hasBoardTooltip ? undefined : title}
      >
        {!user.avatar && <span className={styles.initials}>{initials(user.name).slice(0, 2)}</span>}
        {withCreatorIndicator && <span className={styles.creatorIndicator}>+</span>}
      </span>
    );

    const contentNode = onClick ? (
      <button
        data-id={id}
        aria-label={title}
        type="button"
        disabled={isDisabled}
        className={classNames(styles.button, className)}
        onClick={onClick}
      >
        {avatarNode}
      </button>
    ) : (
      <span className={className}>{avatarNode}</span>
    );

    if (!hasBoardTooltip) {
      return contentNode;
    }

    return (
      <Popup
        basic
        content={title}
        position="bottom center"
        trigger={contentNode}
        on="hover"
        popperModifiers={[
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              altAxis: true,
              padding: 12,
            },
          },
        ]}
        className={styles.boardTooltip}
      />
    );
  },
);

UserAvatar.propTypes = {
  id: PropTypes.string,
  size: PropTypes.oneOf(Object.values(Sizes)),
  variant: PropTypes.oneOf(Object.values(Variants)),
  isDisabled: PropTypes.bool,
  withCreatorIndicator: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

UserAvatar.defaultProps = {
  id: undefined,
  size: Sizes.MEDIUM,
  variant: Variants.DEFAULT,
  isDisabled: false,
  withCreatorIndicator: false,
  className: undefined,
  onClick: undefined,
};

export default UserAvatar;
