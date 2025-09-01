/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import classNames from 'classnames';

import ProjectList from './ProjectList';
import { selectIsSidebarExpanded } from '../../../selectors/sidebarSelectors';
import entryActions from '../../../entry-actions';

import styles from './Sidebar.module.scss';

const Sidebar = React.memo(() => {
  const isExpanded = useSelector(selectIsSidebarExpanded);
  const dispatch = useDispatch();

  const handleOverlayClick = () => {
    if (isExpanded) {
      dispatch(entryActions.toggleSidebar());
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      <div
        className={classNames(styles.overlay, {
          [styles.visible]: isExpanded,
        })}
        onClick={handleOverlayClick}
      />

      {/* Sidebar */}
      <div
        className={classNames(styles.wrapper, {
          [styles.expanded]: isExpanded,
        })}
      >
        <div className={styles.content}>
          <ProjectList />
        </div>
      </div>
    </>
  );
});

Sidebar.propTypes = {};

export default Sidebar;
