/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Icon, Loader } from 'semantic-ui-react';
import { ErrorBoundary } from '@sentry/react';
import { useTransitioning } from '../../../lib/hooks';

import selectors from '../../../selectors';
import { selectIsSidebarExpanded } from '../../../selectors/sidebarSelectors';
import { BoardViews } from '../../../constants/Enums';
import Home from '../Home';
import Board from '../../boards/Board';
import GanttWorkspace from '../../gantt';
import PresentationWorkspace from '../../presentation/PresentationWorkspace';
import Paths from '../../../constants/Paths';

import styles from './Static.module.scss';

const DashboardWorkspace = React.lazy(() => import('../../project-dashboard/DashboardWorkspace'));

function DashboardErrorFallback() {
  const [t] = useTranslation();

  return (
    <main className={styles.message} role="alert">
      <p>{t('common.unexpectedApplicationError')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('action.reload')}
      </button>
    </main>
  );
}

const Static = React.memo(() => {
  const { cardId, projectId } = useSelector(selectors.selectPath);
  const pathsMatch = useSelector(selectors.selectPathsMatch);
  const board = useSelector(selectors.selectCurrentBoard);
  const isFetching = useSelector(selectors.selectIsContentFetching);
  const isFavoritesActive = useSelector(
    selectors.selectIsFavoritesActiveForCurrentUser
  );
  const isSidebarExpanded = useSelector(selectIsSidebarExpanded);
  const [searchParams] = useSearchParams();
  const isDashboardTv =
    pathsMatch?.pattern.path === Paths.DASHBOARD && searchParams.get('tv') === '1';

  const [t] = useTranslation();

  const wrapperRef = useRef(null);

  const handleTransitionEnd = useTransitioning(
    wrapperRef,
    styles.wrapperTransitioning,
    [isFavoritesActive]
  );

  let wrapperClassNames;
  let contentNode;

  if (isFetching) {
    wrapperClassNames = [styles.wrapperLoader];
    contentNode = <Loader active size="huge" />;
  } else if (pathsMatch?.pattern.path === Paths.DASHBOARD) {
    wrapperClassNames = [
      isDashboardTv ? styles.wrapperDashboardTv : styles.wrapperGantt,
      styles.wrapperFlex,
    ];
    contentNode = (
      <ErrorBoundary fallback={DashboardErrorFallback}>
        <React.Suspense fallback={<Loader active size="huge" />}>
          <DashboardWorkspace />
        </React.Suspense>
      </ErrorBoundary>
    );
  } else if (projectId === undefined) {
    wrapperClassNames = [
      isFavoritesActive && styles.wrapperWithFavorites,
      styles.wrapperVertical,
    ];
    contentNode = <Home />;
  } else if (cardId === null) {
    wrapperClassNames = [
      isFavoritesActive && styles.wrapperWithFavorites,
      styles.wrapperFlex,
    ];

    contentNode = (
      <div className={styles.message}>
        <h1>
          {t('common.cardNotFound', {
            context: 'title',
          })}
        </h1>
      </div>
    );
  } else if (board === null) {
    wrapperClassNames = [
      isFavoritesActive && styles.wrapperWithFavorites,
      styles.wrapperFlex,
    ];

    contentNode = (
      <div className={styles.message}>
        <h1>
          {t('common.boardNotFound', {
            context: 'title',
          })}
        </h1>
      </div>
    );
  } else if (projectId === null) {
    wrapperClassNames = [
      isFavoritesActive && styles.wrapperWithFavorites,
      styles.wrapperFlex,
    ];

    contentNode = (
      <div className={styles.message}>
        <h1>
          {t('common.projectNotFound', {
            context: 'title',
          })}
        </h1>
      </div>
    );
  } else if (pathsMatch?.pattern.path === Paths.GANTT) {
    wrapperClassNames = [
      isFavoritesActive ? styles.wrapperGanttWithFavorites : styles.wrapperGantt,
      styles.wrapperFlex,
    ];
    contentNode = <GanttWorkspace />;
  } else if (pathsMatch?.pattern.path === Paths.PRESENTATION) {
    wrapperClassNames = [
      isFavoritesActive
        ? styles.wrapperPresentationWithFavorites
        : styles.wrapperPresentation,
      styles.wrapperFlex,
    ];
    contentNode = <PresentationWorkspace />;
  } else if (board === undefined) {
    wrapperClassNames = [
      isFavoritesActive
        ? styles.wrapperProjectWithFavorites
        : styles.wrapperProject,
      styles.wrapperFlex,
    ];

    contentNode = (
      <div className={styles.message}>
        <Icon
          inverted
          name="hand point up outline"
          size="huge"
          className={styles.messageIcon}
        />
        <h1 className={styles.messageTitle}>
          {t('common.openBoard', {
            context: 'title',
          })}
        </h1>
        <div className={styles.messageContent}>
          <Trans i18nKey="common.createNewOneOrSelectExistingOne" />
        </div>
      </div>
    );
  } else if (board.isFetching) {
    wrapperClassNames = [
      styles.wrapperLoader,
      isFavoritesActive
        ? styles.wrapperProjectWithFavorites
        : styles.wrapperProject,
    ];

    contentNode = <Loader active size="big" />;
  } else {
    wrapperClassNames = [
      isFavoritesActive
        ? styles.wrapperBoardWithFavorites
        : styles.wrapperBoard,
      [BoardViews.GRID, BoardViews.LIST].includes(board.view) &&
        styles.wrapperVertical,
      styles.wrapperFlex,
    ];

    contentNode = <Board />;
  }

  return (
    <div
      ref={wrapperRef}
      className={classNames(styles.wrapper, ...wrapperClassNames, {
        [styles.sidebarExpanded]: isSidebarExpanded && !isDashboardTv,
      })}
      onTransitionEnd={handleTransitionEnd}
    >
      {contentNode}
    </div>
  );
});

export default Static;
