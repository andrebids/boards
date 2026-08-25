import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Icon, Loader } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import { usePresentation } from './PresentationContext';
import PresentationEditor from './PresentationEditor';

import styles from './PresentationWorkspace.module.scss';

const PresentationWorkspace = React.memo(({ isActive }) => {
  const [t] = useTranslation();
  const [searchParams] = useSearchParams();
  const boards = useSelector(selectors.selectBoardsForCurrentProject) || [];
  const {
    presentations,
    selectedBoardId: retainedBoardId,
    canEdit,
    isLoading,
    error,
    activate,
    selectBoard,
    updateSession,
    reload,
  } = usePresentation();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const routeBoardId = searchParams.get('board');
  const selectedBoardId = isActive ? routeBoardId : retainedBoardId;
  const selectedBoard = boards.find(({ id }) => id === selectedBoardId) || null;
  const selectedPresentation = selectedBoard
    ? presentations.find(({ boardId }) => boardId === selectedBoard.id) || null
    : null;

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    selectBoard(routeBoardId);
    const animationFrame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isActive, routeBoardId, selectBoard]);

  const handleCreate = useCallback(async () => {
    if (!selectedBoard) {
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await activate(selectedBoard.id);
    } catch (nextError) {
      setCreateError(nextError);
    } finally {
      setIsCreating(false);
    }
  }, [activate, selectedBoard]);

  if (isLoading) {
    return <Loader active size="huge" />;
  }

  if (error) {
    return (
      <div className={styles.centerState} role="alert">
        <Icon name="warning circle" size="big" />
        <h1>{t('common.presentationsLoadFailed')}</h1>
        <Button variant="secondary" onClick={reload}>
          {t('action.retry')}
        </Button>
      </div>
    );
  }

  let contentNode;
  if (boards.length === 0) {
    contentNode = (
      <section className={styles.emptyState}>
        <Icon name="columns" size="huge" />
        <h2>{t('common.presentationNoBoards')}</h2>
        <p>{t('common.presentationNoBoardsDescription')}</p>
      </section>
    );
  } else if (!selectedBoard) {
    contentNode = (
      <section className={styles.emptyState}>
        <Icon name="columns" size="huge" />
        <h2>{t('common.selectBoard')}</h2>
        <p>{t('common.presentationsDescription')}</p>
      </section>
    );
  } else if (selectedPresentation?.isEnabled) {
    contentNode = (
      <PresentationEditor
        key={selectedPresentation.id}
        boardIds={boards.map(({ id }) => id)}
        presentation={selectedPresentation}
        onSessionUpdate={updateSession}
      />
    );
  } else {
    contentNode = (
      <section className={styles.emptyState}>
        <Icon name="file powerpoint outline" size="huge" />
        <h2>
          {t('common.presentationNotCreatedForBoard', {
            board: selectedBoard.name,
          })}
        </h2>
        <p>{t('common.presentationCreateDescription')}</p>
        {canEdit ? (
          <Button
            variant="primary"
            loading={isCreating}
            disabled={isCreating}
            onClick={handleCreate}
          >
            {t('action.createPresentation')}
          </Button>
        ) : (
          <p>{t('common.presentationManagerRequired')}</p>
        )}
        {createError && (
          <p className={styles.errorMessage} role="alert">
            {t('common.presentationSaveFailed')}
          </p>
        )}
      </section>
    );
  }

  return <main className={styles.workspace}>{contentNode}</main>;
});

PresentationWorkspace.propTypes = {
  isActive: PropTypes.bool.isRequired,
};

export default PresentationWorkspace;
