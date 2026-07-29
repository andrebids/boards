/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

import styles from './CloseButton.module.scss';

const CloseButton = React.memo(({ ariaLabel, className, onClick, title }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    title={title}
    className={className ? `${styles.button} ${className}` : styles.button}
    data-platform-close-button="true"
    onClick={onClick}
  >
    <X aria-hidden="true" className={styles.icon} size={16} strokeWidth={1.5} />
  </button>
));

CloseButton.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
  title: PropTypes.string,
};

CloseButton.defaultProps = {
  className: undefined,
  onClick: undefined,
  title: undefined,
};

export default CloseButton;
