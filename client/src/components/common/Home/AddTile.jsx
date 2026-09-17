/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import PlusIcon from '../../../assets/images/plus-icon.svg?react';

import styles from './Projects.module.scss';

const AddTile = React.memo(({ onAdd }) => {
  const [t] = useTranslation();

  return (
    <button type="button" className={styles.addTile} onClick={onAdd}>
      <PlusIcon className={styles.addTileIcon} />
      <span className={styles.addTileText}>{t('action.createProject')}</span>
    </button>
  );
});

AddTile.propTypes = {
  onAdd: PropTypes.func.isRequired,
};

export default AddTile;
