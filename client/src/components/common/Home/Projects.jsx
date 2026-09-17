/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { isUserAdminOrProjectOwner } from '../../../utils/record-helpers';
import { ProjectsGridStyles } from '../../../constants/Enums';
import RegularGrid from './RegularGrid';
import SquareGrid from './SquareGrid';
import GalleryGrid from './GalleryGrid';

import styles from './Projects.module.scss';

const GRID_BY_STYLE = {
  [ProjectsGridStyles.REGULAR]: RegularGrid,
  [ProjectsGridStyles.SQUARE]: SquareGrid,
  [ProjectsGridStyles.GALLERY]: GalleryGrid,
};

const Projects = React.memo(
  ({ ids, title, titleIcon, withTypeIndicator, onAdd }) => {
    const canAdd = useSelector(state => {
      const user = selectors.selectCurrentUser(state);
      return isUserAdminOrProjectOwner(user);
    });

    const gridStyle = useSelector(selectors.selectProjectsGridStyle);

    const [t] = useTranslation();

    const ProjectsGrid =
      GRID_BY_STYLE[gridStyle] || GRID_BY_STYLE[ProjectsGridStyles.REGULAR];

    return (
      <div
        className={classNames(
          styles.wrapper,
          !title && styles.wrapperWithoutTitle
        )}
      >
        {title && (
          <div className={styles.title}>
            {titleIcon && (
              <Icon name={titleIcon} className={styles.titleIcon} />
            )}
            {t(title, {
              context: 'title',
            })}
          </div>
        )}
        <ProjectsGrid
          ids={ids}
          withTypeIndicator={withTypeIndicator}
          onAdd={onAdd && canAdd ? onAdd : undefined}
        />
      </div>
    );
  }
);

Projects.propTypes = {
  ids: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  title: PropTypes.string,
  titleIcon: PropTypes.string,
  withTypeIndicator: PropTypes.bool, // TODO: use plural form?
  onAdd: PropTypes.func,
};

Projects.defaultProps = {
  title: undefined,
  titleIcon: undefined,
  withTypeIndicator: false,
  onAdd: undefined,
};

export default Projects;
