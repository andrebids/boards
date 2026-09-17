/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import GalleryTile from './GalleryTile';
import AddTile from './AddTile';

import styles from './Projects.module.scss';

const GalleryGrid = React.memo(({ ids, withTypeIndicator, onAdd }) => (
  <div className={styles.galleryGrid}>
    {ids.map((id, index) => (
      <GalleryTile
        key={id}
        id={id}
        index={index}
        withTypeIndicator={withTypeIndicator}
      />
    ))}
    {onAdd && (
      <div className={classNames(styles.galleryCell, styles.tileSmall)}>
        <AddTile onAdd={onAdd} />
      </div>
    )}
  </div>
));

GalleryGrid.propTypes = {
  ids: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  withTypeIndicator: PropTypes.bool,
  onAdd: PropTypes.func,
};

GalleryGrid.defaultProps = {
  withTypeIndicator: false,
  onAdd: undefined,
};

export default GalleryGrid;
