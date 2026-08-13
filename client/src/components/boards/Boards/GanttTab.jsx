/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import { useGantt } from '../../gantt';

import styles from './GanttTab.module.scss';

const GanttTab = React.memo(() => {
  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const pathsMatch = useSelector(selectors.selectPathsMatch);
  const { plan, isLoading } = useGantt();

  if (isLoading || !project || !plan?.isEnabled) {
    return null;
  }

  const isActive = pathsMatch?.pattern.path === Paths.GANTT;

  return (
    <div className={styles.wrapper}>
      <Link
        to={Paths.GANTT.replace(':id', project.id)}
        className={classNames(styles.tab, isActive && styles.tabActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        <span>{t('common.gantt')}</span>
      </Link>
    </div>
  );
});

export default GanttTab;
