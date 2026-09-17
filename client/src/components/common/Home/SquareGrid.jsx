/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import ProjectCard from '../../projects/ProjectCard';
import AddTile from './AddTile';

import styles from './Projects.module.scss';

const SquareGrid = React.memo(({ ids, withTypeIndicator, onAdd }) => (
  <div className={styles.squareGrid}>
    {ids.map(id => (
      <div key={id} className={styles.squareCell}>
        <ProjectCard
          withDescription
          withFavoriteButton
          id={id}
          size="fluid"
          withTypeIndicator={withTypeIndicator}
          className={styles.fillCard}
        />
      </div>
    ))}
    {onAdd && (
      <div className={styles.squareCell}>
        <AddTile onAdd={onAdd} />
      </div>
    )}
  </div>
));

SquareGrid.propTypes = {
  ids: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  withTypeIndicator: PropTypes.bool,
  onAdd: PropTypes.func,
};

SquareGrid.defaultProps = {
  withTypeIndicator: false,
  onAdd: undefined,
};

export default SquareGrid;
