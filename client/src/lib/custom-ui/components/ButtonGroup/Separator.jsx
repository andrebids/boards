/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './ButtonGroup.module.scss';

const Separator = React.memo(({ className }) => (
  <span
    aria-hidden="true"
    className={classNames(styles.separator, className)}
    data-slot="button-group-separator"
  />
));

Separator.propTypes = {
  className: PropTypes.string,
};

Separator.defaultProps = {
  className: undefined,
};

export default Separator;
