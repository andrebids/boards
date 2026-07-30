/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
// The shared adapter is the single allowed boundary around Semantic UI Button.
// eslint-disable-next-line no-restricted-imports
import { Button as SemanticUIButton } from 'semantic-ui-react';

import ButtonGroupContext from './ButtonContext';

import styles from './Button.module.scss';

const Variants = {
  DANGER: 'danger',
  DANGER_SOFT: 'danger-soft',
  GHOST: 'ghost',
  OUTLINE: 'outline',
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
};

const Sizes = {
  LARGE: 'lg',
  MEDIUM: 'md',
  SMALL: 'sm',
};

const normalizeSize = (size) => {
  if (['mini', 'tiny', 'small', Sizes.SMALL].includes(size)) {
    return Sizes.SMALL;
  }

  if (['large', 'big', 'huge', 'massive', Sizes.LARGE].includes(size)) {
    return Sizes.LARGE;
  }

  return Sizes.MEDIUM;
};

const Button = React.forwardRef(
  (
    {
      children,
      className,
      content,
      disabled,
      fluid,
      fullWidth,
      icon,
      isDisabled,
      isIconOnly,
      isPending,
      loading,
      size,
      variant,
      ...props
    },
    ref,
  ) => {
    const group = useContext(ButtonGroupContext);

    const resolvedVariant = variant || group.variant || Variants.PRIMARY;
    const resolvedSize = normalizeSize(size || group.size);
    const resolvedDisabled =
      isDisabled !== undefined
        ? isDisabled
        : disabled !== undefined
          ? disabled
          : group.isDisabled;
    const resolvedPending = isPending !== undefined ? isPending : loading;
    const resolvedFullWidth =
      fullWidth !== undefined ? fullWidth : fluid !== undefined ? fluid : group.fullWidth;
    const resolvedIconOnly =
      isIconOnly !== undefined
        ? isIconOnly
        : Boolean(icon) && children === undefined && content === undefined;

    return (
      <SemanticUIButton
        {...props} // eslint-disable-line react/jsx-props-no-spreading
        ref={ref}
        aria-busy={resolvedPending || undefined}
        aria-disabled={resolvedDisabled || resolvedPending || undefined}
        className={classNames(
          styles.button,
          styles[resolvedVariant],
          styles[resolvedSize],
          resolvedFullWidth && styles.fullWidth,
          resolvedIconOnly && styles.iconOnly,
          className,
        )}
        content={content}
        data-pending={resolvedPending || undefined}
        data-slot="button"
        data-variant={resolvedVariant}
        disabled={Boolean(resolvedDisabled || resolvedPending)}
        fluid={resolvedFullWidth}
        icon={icon}
        loading={resolvedPending}
      >
        {children}
      </SemanticUIButton>
    );
  },
);

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  content: PropTypes.node,
  disabled: PropTypes.bool,
  fluid: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.oneOfType([PropTypes.bool, PropTypes.node, PropTypes.string]),
  isDisabled: PropTypes.bool,
  isIconOnly: PropTypes.bool,
  isPending: PropTypes.bool,
  loading: PropTypes.bool,
  size: PropTypes.string,
  variant: PropTypes.oneOf(Object.values(Variants)),
};

Button.defaultProps = {
  children: undefined,
  className: undefined,
  content: undefined,
  disabled: undefined,
  fluid: undefined,
  fullWidth: undefined,
  icon: undefined,
  isDisabled: undefined,
  isIconOnly: undefined,
  isPending: undefined,
  loading: false,
  size: undefined,
  variant: undefined,
};

export { Sizes, Variants, normalizeSize };
export default Button;
