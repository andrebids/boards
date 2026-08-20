import React from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';

import styles from './GanttTab.module.scss';

const PresentationTab = React.memo(() => {
  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const board = useSelector(selectors.selectCurrentBoard);
  const pathsMatch = useSelector(selectors.selectPathsMatch);

  if (!project) {
    return null;
  }

  const isActive = pathsMatch?.pattern.path === Paths.PRESENTATION;

  return (
    <div className={styles.wrapper}>
      <Link
        to={`${Paths.PRESENTATION.replace(':id', project.id)}${board ? `?board=${board.id}` : ''}`}
        className={classNames(styles.tab, isActive && styles.tabActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        <span>{t('common.presentations')}</span>
      </Link>
    </div>
  );
});

export default PresentationTab;
