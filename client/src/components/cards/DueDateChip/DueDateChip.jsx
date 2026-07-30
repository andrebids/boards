/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useForceUpdate } from '../../../lib/hooks';

import getDateFormat from '../../../utils/get-date-format';

import styles from './DueDateChip.module.scss';

const Sizes = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

const Variants = {
  CHIP: 'chip',
  METADATA: 'metadata',
};

const Statuses = {
  DUE_SOON: 'dueSoon',
  OVERDUE: 'overdue',
};

const LONG_DATE_FORMAT_BY_SIZE = {
  [Sizes.TINY]: 'longDate',
  [Sizes.SMALL]: 'longDate',
  [Sizes.MEDIUM]: 'longDateTime',
};

const FULL_DATE_FORMAT_BY_SIZE = {
  [Sizes.TINY]: 'fullDate',
  [Sizes.SMALL]: 'fullDate',
  [Sizes.MEDIUM]: 'fullDateTime',
};

const STATUS_ICON_PROPS_BY_STATUS = {
  [Statuses.DUE_SOON]: {
    name: 'hourglass half',
  },
  [Statuses.OVERDUE]: {
    name: 'hourglass end',
  },
};

const getStatus = (date) => {
  const secondsLeft = Math.floor((date.getTime() - new Date().getTime()) / 1000);

  if (secondsLeft <= 0) {
    return Statuses.OVERDUE;
  }

  if (secondsLeft <= 24 * 60 * 60) {
    return Statuses.DUE_SOON;
  }

  return null;
};

const DueDateChip = React.memo(
  ({ value, size, variant, isDisabled, withStatus, withStatusIcon, onClick }) => {
    const [t] = useTranslation();
    const forceUpdate = useForceUpdate();

    const statusRef = useRef(null);
    statusRef.current = withStatus ? getStatus(value) : null;

    const intervalRef = useRef(null);
    const isMetadata = variant === Variants.METADATA;
    const currentStatus = statusRef.current;
    const hasLeadingIcon = isMetadata || withStatusIcon;

    const dateFormat = getDateFormat(
      value,
      LONG_DATE_FORMAT_BY_SIZE[size],
      FULL_DATE_FORMAT_BY_SIZE[size],
    );

    useEffect(() => {
      if (withStatus && statusRef.current !== Statuses.OVERDUE) {
        intervalRef.current = setInterval(() => {
          const status = getStatus(value);

          if (status !== statusRef.current) {
            forceUpdate();
          }

          if (status === Statuses.OVERDUE) {
            clearInterval(intervalRef.current);
          }
        }, 1000);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [value, withStatus, forceUpdate]);

    const contentNode = (
      <span
        className={classNames(
          styles.wrapper,
          styles[`wrapper${upperFirst(size)}`],
          styles[`wrapper${upperFirst(variant)}`],
          currentStatus && styles[`wrapper${upperFirst(currentStatus)}`],
          onClick && styles.wrapperHoverable,
        )}
      >
        {hasLeadingIcon && (
          <span
            aria-hidden="true"
            className={classNames(
              styles.iconSlot,
              currentStatus && styles[`iconSlot${upperFirst(currentStatus)}`],
            )}
          >
            <Icon
              fitted
              name={
                currentStatus ? STATUS_ICON_PROPS_BY_STATUS[currentStatus].name : 'calendar outline'
              }
              className={styles.leadingIcon}
            />
          </span>
        )}
        <span className={styles.label}>
          {t(`format:${dateFormat}`, {
            value,
            postProcess: 'formatDate',
          })}
        </span>
      </span>
    );

    return onClick ? (
      <button type="button" disabled={isDisabled} className={styles.button} onClick={onClick}>
        {contentNode}
      </button>
    ) : (
      contentNode
    );
  },
);

DueDateChip.propTypes = {
  value: PropTypes.instanceOf(Date).isRequired,
  size: PropTypes.oneOf(Object.values(Sizes)),
  variant: PropTypes.oneOf(Object.values(Variants)),
  isDisabled: PropTypes.bool,
  withStatus: PropTypes.bool.isRequired,
  withStatusIcon: PropTypes.bool,
  onClick: PropTypes.func,
};

DueDateChip.defaultProps = {
  size: Sizes.MEDIUM,
  variant: Variants.CHIP,
  isDisabled: false,
  withStatusIcon: false,
  onClick: undefined,
};

export default DueDateChip;
