import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Icon, Loader } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import { usePresentation } from './PresentationContext';
import PresentationEditor from './PresentationEditor';

import styles from './PresentationWorkspace.module.scss';

const PresentationWorkspace = React.memo(() => {
  const [t] = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const boards = useSelector(selectors.selectBoardsForCurrentProject) || [];
  const { presentations, canEdit, isLoading, error, activate, reload } = usePresentation();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const selectedBoardId = searchParams.get('board');
  const selectedBoard = boards.find(({ id }) => id === selectedBoardId) || null;
  const selectedPresentation = selectedBoard
    ? presentations.find(({ boardId }) => boardId === selectedBoard.id) || null
    : null;

  const handleBoardChange = useCallback(
    ({ target: { value } }) => {
      setCreateError(null);
      setSearchParams(value ? { board: value } : {});
    },
    [setSearchParams],
  );

  const handleBoardOpen = useCallback(
    (boardId) => {
      setCreateError(null);
      setSearchParams({ board: boardId });
    },
    [setSearchParams],
  );

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
      <section className={styles.boardList} aria-labelledby="presentations-board-list-title">
        <h2 id="presentations-board-list-title">{t('common.presentationsByBoard')}</h2>
        <ul>
          {boards.map((board) => {
            const presentation = presentations.find(({ boardId }) => boardId === board.id);
            const isAvailable = Boolean(presentation?.isEnabled);

            return (
              <li key={board.id}>
                <div className={styles.boardIdentity}>
                  <Icon name="columns" />
                  <div>
                    <strong>{board.name}</strong>
                    <span>
                      {t(
                        isAvailable
                          ? 'common.presentationCreated'
                          : 'common.presentationNotCreated',
                      )}
                    </span>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => handleBoardOpen(board.id)}>
                  {t(isAvailable ? 'action.open' : 'action.view')}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  } else if (selectedPresentation?.isEnabled) {
    contentNode = (
      <PresentationEditor key={selectedPresentation.id} presentation={selectedPresentation} />
    );
  } else {
    contentNode = (
      <section className={styles.emptyState}>
        <Icon name="file powerpoint outline" size="huge" />
        <h2>{t('common.presentationNotCreatedForBoard', { board: selectedBoard.name })}</h2>
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

  return (
    <main className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1>{t('common.presentations')}</h1>
          <p>{t('common.presentationsDescription')}</p>
        </div>
        {boards.length > 0 && (
          <label htmlFor="presentation-board-picker" className={styles.boardPicker}>
            <span>{t('common.board')}</span>
            <select
              id="presentation-board-picker"
              value={selectedBoard?.id || ''}
              onChange={handleBoardChange}
            >
              <option value="">{t('common.allBoards')}</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      {contentNode}
    </main>
  );
});

export default PresentationWorkspace;
