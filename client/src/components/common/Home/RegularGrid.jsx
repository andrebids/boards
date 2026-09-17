/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Grid } from 'semantic-ui-react';

import ProjectCard from '../../projects/ProjectCard';
import PlusIcon from '../../../assets/images/plus-icon.svg?react';

import styles from './Projects.module.scss';

const RegularGrid = React.memo(({ ids, withTypeIndicator, onAdd }) => {
  const [t] = useTranslation();

  return (
    <Grid>
      {ids.map(id => (
        <Grid.Column key={id} className={styles.column}>
          <ProjectCard
            withDescription
            withFavoriteButton
            id={id}
            withTypeIndicator={withTypeIndicator}
            className={styles.card}
          />
        </Grid.Column>
      ))}
      {onAdd && (
        <Grid.Column className={styles.column}>
          <button
            type="button"
            className={classNames(styles.card, styles.addButton)}
            onClick={onAdd}
          >
            <div className={styles.addButtonCover} />
            <div className={styles.addButtonTitleWrapper}>
              <div className={styles.addButtonTitle}>
                <PlusIcon className={styles.addButtonTitleIcon} />
                {t('action.createProject')}
              </div>
            </div>
          </button>
        </Grid.Column>
      )}
    </Grid>
  );
});

RegularGrid.propTypes = {
  ids: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  withTypeIndicator: PropTypes.bool,
  onAdd: PropTypes.func,
};

RegularGrid.defaultProps = {
  withTypeIndicator: false,
  onAdd: undefined,
};

export default RegularGrid;
