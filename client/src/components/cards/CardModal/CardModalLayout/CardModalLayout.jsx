/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Icon } from 'semantic-ui-react';

import styles from './CardModalLayout.module.scss';

const CardModalMetadataItem = React.memo(({ label, children }) => (
  <div className={styles.metadataItem}>
    <div className={styles.metadataLabel}>{label}</div>
    <div className={styles.metadataContent}>{children}</div>
  </div>
));

CardModalMetadataItem.propTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

const CardModalMetadata = React.memo(({ children }) => (
  <div className={styles.metadataBar}>{children}</div>
));

CardModalMetadata.propTypes = {
  children: PropTypes.node.isRequired,
};

const CardModalMetadataAddButton = React.forwardRef(
  ({ ariaLabel, circular, className, icon, onClick }, ref) => (
    <button
      ref={ref}
      type="button"
      className={classNames(
        styles.metadataAddButton,
        circular && styles.metadataAddButtonCircular,
        className,
      )}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <Icon fitted name={icon} />
    </button>
  ),
);

CardModalMetadataAddButton.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  circular: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.string,
  onClick: PropTypes.func,
};

CardModalMetadataAddButton.defaultProps = {
  circular: false,
  className: undefined,
  icon: 'add',
  onClick: undefined,
};

const CardModalActionGroup = React.memo(({ title, children }) => (
  <div className={styles.actions}>
    <span className={styles.actionsTitle}>{title}</span>
    {children}
  </div>
));

CardModalActionGroup.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

const CardModalActionButton = React.forwardRef(
  ({ icon, children, className, danger, disabled, onClick }, ref) => (
    <button
      type="button"
      ref={ref}
      disabled={disabled}
      className={classNames(
        'ui',
        'fluid',
        'button',
        styles.actionButton,
        danger && styles.actionButtonDanger,
        className,
      )}
      onClick={onClick}
    >
      <Icon name={icon} className={styles.actionIcon} />
      {children}
    </button>
  ),
);

CardModalActionButton.propTypes = {
  icon: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  danger: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

CardModalActionButton.defaultProps = {
  className: undefined,
  danger: false,
  disabled: false,
  onClick: undefined,
};

const CardModalBody = React.memo(({ children }) => (
  <div className={styles.bodyGrid}>{children}</div>
));

CardModalBody.propTypes = {
  children: PropTypes.node.isRequired,
};

const CardModalMain = React.memo(({ children }) => (
  <main className={styles.mainContent}>{children}</main>
));

CardModalMain.propTypes = {
  children: PropTypes.node.isRequired,
};

const CardModalSidebar = React.memo(({ children }) => (
  <aside className={styles.actionRail}>{children}</aside>
));

CardModalSidebar.propTypes = {
  children: PropTypes.node.isRequired,
};

const CardModalLayout = React.memo(({ icon, title, children }) => (
  <div className={styles.wrapper}>
    <header className={styles.header}>
      <Icon name={icon} className={styles.headerIcon} />
      <div className={styles.headerTitleWrapper}>
        {typeof title === 'string' ? <div className={styles.headerTitle}>{title}</div> : title}
      </div>
    </header>
    {children}
  </div>
));

CardModalLayout.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};

export {
  CardModalActionButton,
  CardModalActionGroup,
  CardModalBody,
  CardModalMain,
  CardModalMetadata,
  CardModalMetadataAddButton,
  CardModalMetadataItem,
  CardModalSidebar,
};

export default CardModalLayout;
