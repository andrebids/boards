import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import selectors from '../../selectors';
import Paths from '../../constants/Paths';
import { canUseTransversal } from './access';
import styles from '../boards/Boards/GanttTab.module.scss';

const TransversalTab = React.memo(() => {
  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const userId = useSelector(selectors.selectCurrentUserId);
  const path = useSelector(selectors.selectPathsMatch);
  if (!canUseTransversal(project, userId)) return null;
  const isActive = path?.pattern.path === Paths.TRANSVERSAL;
  return (
    <div className={styles.wrapper}>
      <Link
        to={Paths.TRANSVERSAL.replace(':id', project.id)}
        className={classNames(styles.tab, isActive && styles.tabActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        {t('common.transversalTitle')}
      </Link>
    </div>
  );
});

export default TransversalTab;
