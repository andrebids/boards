/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import ProjectCard from '../../projects/ProjectCard';

import styles from './Projects.module.scss';

const TileSizes = {
  SMALL: 'small', // 1x1
  WIDE: 'wide', // 2x1
  TALL: 'tall', // 1x2
  LARGE: 'large', // 2x2
};

// The rhythm repeats every seven tiles, so the same list always renders the
// same mosaic. The first project anchors the grid, and favorites are promoted
// wherever they sit.
const getTileSize = (index, isFavorite) => {
  if (index === 0 || isFavorite) {
    return TileSizes.LARGE;
  }

  switch (index % 7) {
    case 3:
      return TileSizes.WIDE;
    case 5:
      return TileSizes.TALL;
    default:
      return TileSizes.SMALL;
  }
};

const GalleryTile = React.memo(({ id, index, withTypeIndicator }) => {
  const selectProjectById = useMemo(
    () => selectors.makeSelectProjectById(),
    []
  );

  const project = useSelector(state => selectProjectById(state, id));
  const tileSize = getTileSize(index, project.isFavorite);

  return (
    <div
      className={classNames(
        styles.galleryCell,
        styles[`tile${upperFirst(tileSize)}`]
      )}
    >
      <ProjectCard
        withDescription
        withFavoriteButton
        id={id}
        size="fluid"
        withTypeIndicator={withTypeIndicator}
        className={styles.fillCard}
      />
    </div>
  );
});

GalleryTile.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  withTypeIndicator: PropTypes.bool,
};

GalleryTile.defaultProps = {
  withTypeIndicator: false,
};

export default GalleryTile;
