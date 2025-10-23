/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { usePopup } from '../../../../lib/popup';

import selectors from '../../../../selectors';
import { selectIsTimelinePanelExpanded } from '../../../../selectors/timelinePanelSelectors';
import entryActions from '../../../../entry-actions';
import { BoardContexts, BoardViews } from '../../../../constants/Enums';
import { BoardContextIcons, BoardViewIcons } from '../../../../constants/Icons';
import ActionsStep from './ActionsStep';

import styles from './RightSide.module.scss';

const RightSide = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const isTimelinePanelExpanded = useSelector(selectIsTimelinePanelExpanded);
  const [t] = useTranslation();

  const dispatch = useDispatch();

  const handleSelectViewClick = useCallback(
    ({ currentTarget: { value: view } }) => {
      dispatch(entryActions.updateViewInCurrentBoard(view));
    },
    [dispatch]
  );

  const handleTimelineClick = useCallback(() => {
    dispatch(entryActions.toggleTimelinePanel());
  }, [dispatch]);

  const handleFinanceClick = useCallback(() => {
    // Alternar entre KANBAN e FINANCE
    const newView = board.view === BoardViews.FINANCE ? BoardViews.KANBAN : BoardViews.FINANCE;
    dispatch(entryActions.updateViewInCurrentBoard(newView));
  }, [board.view, dispatch]);

  const ActionsPopup = usePopup(ActionsStep, { variantClass: 'glass' });

  // Verificar se user é finance member (TODO: implementar selector adequado)
  // Por enquanto, mostrar apenas para project managers
  const isProjectManager = useSelector(state =>
    selectors.selectIsCurrentUserManagerForCurrentProject(state),
  );

  const views = [];
  if (board.context === BoardContexts.BOARD) {
    views.unshift(BoardViews.KANBAN);
  }

  return (
    <>
      <div className={styles.action}>
        <div className={styles.buttonGroup}>
          {views.map(view => (
            <button
              key={view}
              type="button"
              value={view}
              disabled={view === board.view}
              className={styles.button}
              onClick={handleSelectViewClick}
            >
              <Icon fitted name={BoardViewIcons[view]} />
            </button>
          ))}
        </div>
      </div>
      {isProjectManager && (
        <div className={styles.action}>
          <button
            type="button"
            className={`${styles.button} ${board.view === BoardViews.FINANCE ? styles.active : ''}`}
            onClick={handleFinanceClick}
            aria-label={t('finance.title', { defaultValue: 'Painel Financeiro' })}
          >
            <Icon fitted name="euro" />
          </button>
        </div>
      )}
      <div className={styles.action}>
        <button
          type="button"
          className={styles.button}
          onClick={handleTimelineClick}
          aria-label={t('action.openActivityHistory')}
        >
          <Icon fitted name="history" />
        </button>
      </div>
      <div className={styles.action}>
        <ActionsPopup>
          <button type="button" className={styles.button}>
            <Icon fitted name={BoardContextIcons[board.context]} />
          </button>
        </ActionsPopup>
      </div>
    </>
  );
});

export default RightSide;
