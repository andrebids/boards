/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { usePopup } from '../../../../lib/popup';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import { HomeViewIcons } from '../../../../constants/Icons';
import SelectGridStyleStep from './SelectGridStyleStep';
import SelectViewStep from './SelectViewStep';
import GridStyleIcons from './grid-style-icons';

import styles from './RightSide.module.scss';

const RightSide = React.memo(() => {
  const currentView = useSelector(selectors.selectHomeView); // TODO: rename?
  const currentOrder = useSelector(selectors.selectProjectsOrder); // TODO: rename?
  const currentGridStyle = useSelector(selectors.selectProjectsGridStyle);
  const isHiddenVisible = useSelector(selectors.selectIsHiddenProjectsVisible);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleViewSelect = useCallback(
    view => {
      dispatch(entryActions.updateHomeView(view));
    },
    [dispatch]
  );

  const handleOrderSelect = useCallback(
    order => {
      dispatch(entryActions.updateProjectsOrder(order));
    },
    [dispatch]
  );

  const handleGridStyleSelect = useCallback(
    gridStyle => {
      dispatch(entryActions.updateProjectsGridStyle(gridStyle));
    },
    [dispatch]
  );

  const handleToggleHiddenClick = useCallback(() => {
    dispatch(entryActions.toggleHiddenProjects(!isHiddenVisible));
  }, [isHiddenVisible, dispatch]);

  const SelectGridStylePopup = usePopup(SelectGridStyleStep, {
    variantClass: 'glass',
  });

  const SelectViewPopup = usePopup(SelectViewStep, { variantClass: 'glass' });

  const CurrentGridStyleIcon = GridStyleIcons[currentGridStyle];

  const hiddenLabel = t(
    isHiddenVisible ? 'common.hideHiddenProjects' : 'common.showHiddenProjects'
  );

  return (
    <>
      <div className={styles.action}>
        <button
          type="button"
          title={hiddenLabel}
          aria-label={hiddenLabel}
          className={classNames(styles.button)}
          onClick={handleToggleHiddenClick}
        >
          <Icon
            fitted
            className={isHiddenVisible ? undefined : styles.visibilityIcon}
            name={isHiddenVisible ? 'eye slash' : 'eye'}
          />
        </button>
      </div>
      <div className={styles.action}>
        <SelectGridStylePopup
          value={currentGridStyle}
          onSelect={handleGridStyleSelect}
        >
          <button
            type="button"
            title={t('common.gridLayout')}
            className={styles.button}
          >
            <CurrentGridStyleIcon className={styles.svgIcon} />
          </button>
        </SelectGridStylePopup>
      </div>
      <div className={styles.action}>
        <SelectViewPopup
          view={currentView}
          order={currentOrder}
          onViewSelect={handleViewSelect}
          onOrderSelect={handleOrderSelect}
        >
          <button
            type="button"
            title={t('common.selectView', { context: 'title' })}
            className={styles.button}
          >
            <Icon fitted name={HomeViewIcons[currentView]} />
          </button>
        </SelectViewPopup>
      </div>
    </>
  );
});

export default RightSide;
