/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Comment, Icon, Loader } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { selectIsTimelinePanelExpanded } from '../../../selectors/timelinePanelSelectors';
import entryActions from '../../../entry-actions';
import Item from '../BoardActivitiesModal/Item';

import styles from './BoardActivitiesPanel.module.scss';

const BoardActivitiesPanel = React.memo(() => {
  const isExpanded = useSelector(selectIsTimelinePanelExpanded);
  const activityIds =
    useSelector(selectors.selectActivityIdsForCurrentBoard) || [];
  const currentBoard = useSelector(selectors.selectCurrentBoard);
  const isActivitiesFetching = currentBoard
    ? currentBoard.isActivitiesFetching
    : false;
  const isAllActivitiesFetched = currentBoard
    ? currentBoard.isAllActivitiesFetched
    : true;

  const [t] = useTranslation();
  const dispatch = useDispatch();
  const [hasTriggeredFetch, setHasTriggeredFetch] = useState(false);

  // Reset hasTriggeredFetch quando mudamos de board
  useEffect(() => {
    setHasTriggeredFetch(false);
  }, [currentBoard?.id]);

  // Carregar atividades quando painel é expandido pela primeira vez
  useEffect(() => {
    if (isExpanded && !hasTriggeredFetch) {
      dispatch(entryActions.fetchActivitiesInCurrentBoard());
      setHasTriggeredFetch(true);
    }
  }, [isExpanded, hasTriggeredFetch, dispatch, currentBoard?.id]);

  const handleToggle = useCallback(() => {
    dispatch(entryActions.toggleTimelinePanel());
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    dispatch(entryActions.fetchActivitiesInCurrentBoard());
  }, [dispatch]);

  return (
    <div
      className={`${styles.panel} ${isExpanded ? styles.expanded : styles.collapsed} glass-panel`}
      role="complementary"
      aria-label={t('common.boardActions_title')}
    >
      {/* Header sempre carregado */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          {isExpanded ? t('common.boardActions_title') : ''}
        </h3>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggle}
          aria-label={
            isExpanded ? t('action.collapsePanel') : t('action.expandPanel')
          }
        >
          <Icon fitted name={isExpanded ? 'chevron right' : 'chevron left'} />
        </button>
      </div>

      {/* Conteúdo carregado apenas quando expandido */}
      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.itemsWrapper}>
            <Comment.Group className={styles.items}>
              {activityIds.map(activityId => (
                <Item key={activityId} id={activityId} />
              ))}
            </Comment.Group>
          </div>
          
          {/* Loading state usando sistema existente */}
          {isActivitiesFetching && (
            <div className={styles.loaderWrapper}>
              <Loader active inverted inline="centered" size="small" />
            </div>
          )}
          
          {/* Botão "Carregar Mais" usando sistema beforeId existente */}
          {!isActivitiesFetching && !isAllActivitiesFetched && (
            <div className={styles.loadMoreWrapper}>
              <button 
                onClick={handleLoadMore}
                className={styles.loadMoreButton}
                type="button"
              >
                Carregar Mais Atividades ({activityIds.length} carregadas)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default BoardActivitiesPanel;
