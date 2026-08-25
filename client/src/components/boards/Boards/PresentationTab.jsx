import React, { useCallback } from 'react';
import classNames from 'classnames';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';
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
          <Dropdown
            compact
            selection
            aria-label={t('common.selectBoard')}
            className={styles.boardSelect}
            value={selectedBoardId || ''}
            options={[
              { key: '', text: t('common.selectBoard'), value: '' },
              ...boards.map((nextBoard) => ({
                key: nextBoard.id,
                text: nextBoard.name,
                value: nextBoard.id,
              })),
            ]}
            onChange={(_, { value }) => handleBoardSelect(value || undefined)}
          />
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
