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

import selectors from '../../../selectors';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { PresenceStatuses } from '../../../constants/Enums';

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

const PRESENCE_TITLE_KEYS = {
  [PresenceStatuses.ONLINE]: 'common.online',
  [PresenceStatuses.IDLE]: 'common.away',
};

const COLORS = [
  'emerald',
  'peter-river',
  'wisteria',
  'carrot',
  'alizarin',
  'turquoise',
  'midnight-blue',
];

const getColor = (name) => {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) {
    sum += name.charCodeAt(i);
  }

  return COLORS[sum % COLORS.length];
};

const UserAvatar = React.memo(
  ({
    id,
    fallbackUser,
    size,
    variant,
    isDisabled,
    withCreatorIndicator,
    withPresence,
    withTitle,
    className,
    onClick,
  }) => {
    const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

    const user = useSelector((state) => selectUserById(state, id)) || fallbackUser;
    const currentUserId = useSelector(selectors.selectCurrentUserId);
    const [t] = useTranslation();
    // Como no Pro, o nosso próprio avatar nunca leva ponto.
    const presenceStatus =
      withPresence && user.id !== currentUserId ? user.presenceStatus : undefined;

    const title =
      user.id === StaticUserIds.DELETED
        ? t(`common.${user.name}`, {
            context: 'title',
          })
        : user.name;

    const contentNode = (
      <span
        title={withTitle ? title : undefined}
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
      >
        {!user.avatar && <span className={styles.initials}>{initials(user.name).slice(0, 2)}</span>}
        {withCreatorIndicator && (
          <span className={styles.creatorIndicator}>
            <svg viewBox="0 -2 24 24" className={styles.creatorCrown} aria-hidden="true">
              <path d="M5 16 L3 7 L8 10 L12 4 L16 10 L21 7 L19 16 Z" />
            </svg>
          </span>
        )}
        {presenceStatus && (
          <span
            data-status={presenceStatus}
            title={t(PRESENCE_TITLE_KEYS[presenceStatus])}
            className={classNames(
              styles.statusDot,
              styles[`statusDot${upperFirst(size)}`],
              withCreatorIndicator && styles.statusDotShifted,
            )}
          />
        )}
      </span>
    );

    return onClick ? (
      <button
        data-id={id}
        type="button"
        aria-label={title}
        disabled={isDisabled}
        className={classNames(styles.button, className)}
        onClick={onClick}
      >
        {contentNode}
      </button>
    ) : (
      <span className={className}>{contentNode}</span>
    );
  },
);

UserAvatar.propTypes = {
  id: PropTypes.string,
  fallbackUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    avatar: PropTypes.shape({
      thumbnailUrls: PropTypes.shape({
        cover180: PropTypes.string.isRequired,
      }).isRequired,
    }),
  }),
  size: PropTypes.oneOf(Object.values(Sizes)),
  variant: PropTypes.oneOf(Object.values(Variants)),
  isDisabled: PropTypes.bool,
  withCreatorIndicator: PropTypes.bool,
  withPresence: PropTypes.bool,
  withTitle: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

UserAvatar.defaultProps = {
  id: undefined,
  fallbackUser: undefined,
  size: Sizes.MEDIUM,
  variant: Variants.DEFAULT,
  isDisabled: false,
  withCreatorIndicator: false,
  withPresence: false,
  withTitle: true,
  className: undefined,
  onClick: undefined,
};

export default UserAvatar;
