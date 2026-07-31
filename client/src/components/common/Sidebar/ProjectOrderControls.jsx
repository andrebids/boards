/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import {
  resetProjectsOrder,
  resetFavoritesOrder,
} from '../../../actions/sidebarActions';
import {
  selectProjectsOrder,
  selectFavoritesOrder,
} from '../../../selectors/sidebarSelectors';

import styles from './ProjectOrderControls.module.scss';

const ProjectOrderControls = React.memo(() => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const customOrder = useSelector(selectProjectsOrder);
  const customFavOrder = useSelector(selectFavoritesOrder);

  const handleResetOrder = () => {
    dispatch(resetProjectsOrder());
  };

  const handleResetFavoritesOrder = () => {
    dispatch(resetFavoritesOrder());
  };

  // Mostrar controles apenas quando houver ordenação personalizada a ser resetada
  const hasAnyCustomOrder =
    (customOrder && customOrder.length > 0) ||
    (customFavOrder && customFavOrder.length > 0);
  if (!hasAnyCustomOrder) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <button
          className={styles.resetButton}
          onClick={handleResetOrder}
          type="button"
          title={t('common.resetProjectsOrder')}
        >
          <i className="fas fa-sort-alpha-down" />
        </button>
        <button
          className={styles.resetButton}
          onClick={handleResetFavoritesOrder}
          type="button"
          title={t('common.resetFavoritesOrder')}
        >
          <i className="fas fa-star" />
        </button>
      </div>
    </div>
  );
});

ProjectOrderControls.propTypes = {};

export default ProjectOrderControls;
