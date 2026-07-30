/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import { Button as SemanticUIButton } from 'semantic-ui-react';

import ButtonGroupContext from '../Button/ButtonContext';
import { Variants } from '../Button/Button';
import Separator from './Separator';

import styles from './ButtonGroup.module.scss';

const ButtonGroup = React.memo(
  ({
    children,
    className,
    disabled,
    fluid,
    fullWidth,
    isDisabled,
    orientation,
    role,
    size,
    variant,
    ...props
  }) => {
    const resolvedDisabled = isDisabled !== undefined ? isDisabled : disabled;
    const resolvedFullWidth = fullWidth !== undefined ? fullWidth : fluid;
    const contextValue = useMemo(
      () => ({
        fullWidth: resolvedFullWidth,
        isDisabled: resolvedDisabled,
        size,
        variant,
      }),
      [resolvedDisabled, resolvedFullWidth, size, variant],
    );

    return (
      <ButtonGroupContext.Provider value={contextValue}>
        <SemanticUIButton.Group
          {...props} // eslint-disable-line react/jsx-props-no-spreading
          className={classNames(
            styles.group,
            orientation === 'vertical' ? styles.vertical : styles.horizontal,
            resolvedFullWidth && styles.fullWidth,
            className,
          )}
          data-orientation={orientation}
          data-slot="button-group"
          fluid={resolvedFullWidth}
          role={role}
          vertical={orientation === 'vertical'}
        >
          {children}
        </SemanticUIButton.Group>
      </ButtonGroupContext.Provider>
    );
  },
);

ButtonGroup.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  fluid: PropTypes.bool,
  fullWidth: PropTypes.bool,
  isDisabled: PropTypes.bool,
  orientation: PropTypes.oneOf(['horizontal', 'vertical']),
  role: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.oneOf(Object.values(Variants)),
};

ButtonGroup.defaultProps = {
  className: undefined,
  disabled: undefined,
  fluid: undefined,
  fullWidth: undefined,
  isDisabled: undefined,
  orientation: 'horizontal',
  role: 'group',
  size: undefined,
  variant: Variants.SECONDARY,
};

ButtonGroup.Separator = Separator;

export default ButtonGroup;
