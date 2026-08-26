import React, { useCallback } from 'react';
import classNames from 'classnames';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import makePresentationBoardSearchParams, {
  makePathWithPresentationBoard,
} from '../../presentation/presentationNavigation';

import styles from './GanttTab.module.scss';

const PresentationTab = React.memo(() => {
  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const board = useSelector(selectors.selectCurrentBoard);
  const boards = useSelector(selectors.selectBoardsForCurrentProject) || [];
  const pathsMatch = useSelector(selectors.selectPathsMatch);
  const [searchParams, setSearchParams] = useSearchParams();

  const isActive = pathsMatch?.pattern.path === Paths.PRESENTATION;
  const selectedBoardId = searchParams.get('board');
  const handleBoardSelect = useCallback(
    (boardId) => {
      setSearchParams(makePresentationBoardSearchParams(boardId));
    },
    [setSearchParams],
  );

  if (!project) {
    return null;
  }

  const presentationPath = makePathWithPresentationBoard(
    Paths.PRESENTATION.replace(':id', project.id),
    selectedBoardId || board?.id,
  );

  return (
    <div className={styles.wrapper}>
      {isActive ? (
        <div className={classNames(styles.tab, styles.tabActive, styles.tabWithSelect)}>
          <Link to={presentationPath} className={styles.tabLink} aria-current="page">
            <span>{t('common.presentations')}</span>
          </Link>
          <select
            aria-label={t('common.selectBoard')}
            className={styles.boardSelect}
            value={selectedBoardId || ''}
            onChange={({ target: { value } }) => handleBoardSelect(value || undefined)}
          >
            <option value="">{t('common.selectBoard')}</option>
            {boards.map((nextBoard) => (
              <option key={nextBoard.id} value={nextBoard.id}>
                {nextBoard.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Link to={presentationPath} className={styles.tab}>
          <span>{t('common.presentations')}</span>
        </Link>
      )}
    </div>
  );
});

export default PresentationTab;
