import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import selectors from '../../selectors';
import { Button } from '../../lib/custom-ui';
import { canUseTransversal, isAccessError } from './access';
import TransversalCard from './TransversalCard';
import styles from './TransversalWorkspace.module.scss';

const Column = React.memo(({ projectId, stage, boardId, onDenied }) => {
  const [t] = useTranslation();
  const [cards, setCards] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef(null);
  const alive = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  const load = useCallback(
    async (after) => {
      if (busy.current) return;
      busy.current = true;
      setIsLoading(true);
      setError(false);
      try {
        const result = await api.getTransversalCards(projectId, {
          stage: stage.key,
          ...(boardId ? { boardId } : {}),
          ...(after ? { after } : {}),
        });
        if (!alive.current) return;
        setCards((previous) => {
          const items = after ? [...previous, ...result.items] : result.items;
          return [...new Map(items.map((card) => [card.id, card])).values()];
        });
        setCursor(result.nextCursor);
        setHasLoaded(true);
      } catch (nextError) {
        if (!alive.current) return;
        if (isAccessError(nextError)) onDenied();
        else setError(true);
      } finally {
        busy.current = false;
        if (alive.current) setIsLoading(false);
      }
    },
    [projectId, stage.key, boardId, onDenied],
  );

  useEffect(() => {
    if (isVisible) load();
  }, [isVisible, load]);

  return (
    <section
      ref={elementRef}
      className={styles.column}
      aria-label={stage.name}
      aria-busy={isLoading}
    >
      <h2 className={styles.columnTitle}>{stage.name}</h2>
      <div className={styles.cards}>
        {cards.map((card) => (
          <TransversalCard key={card.id} card={card} />
        ))}
        {hasLoaded && !cards.length && !isLoading && !error && (
          <p className={styles.columnMessage}>{t('common.transversalEmptyColumn')}</p>
        )}
        {isLoading && (
          <p role="status" className={styles.columnMessage}>
            {t('common.transversalLoading')}
          </p>
        )}
        {error && (
          <div role="alert" className={styles.columnMessage}>
            <p>{t('common.transversalLoadFailed')}</p>
            <Button variant="secondary" onClick={() => load(cursor)}>
              {t('action.retry')}
            </Button>
          </div>
        )}
        {cursor && !error && (
          <Button variant="secondary" disabled={isLoading} onClick={() => load(cursor)}>
            {t('common.transversalLoadMore')}
          </Button>
        )}
      </div>
    </section>
  );
});

Column.propTypes = {
  projectId: PropTypes.string.isRequired,
  stage: PropTypes.shape({ key: PropTypes.string.isRequired, name: PropTypes.string.isRequired })
    .isRequired,
  boardId: PropTypes.string.isRequired,
  onDenied: PropTypes.func.isRequired,
};

const TransversalWorkspace = React.memo(() => {
  const [t] = useTranslation();
  const project = useSelector(selectors.selectCurrentProject);
  const userId = useSelector(selectors.selectCurrentUserId);
  const [searchParams, setSearchParams] = useSearchParams();
  const boardId = searchParams.get('board') || '';
  const stageKey = searchParams.get('stage') || '';
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const canUse = canUseTransversal(project, userId);
  const projectId = project?.id;
  const configKey = JSON.stringify([project?.transversalMode, project?.transversalUserIds]);
  const requestKey = JSON.stringify([projectId, userId, boardId, revision, configKey]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const onDenied = useCallback(() => {
    setSnapshot(null);
    setError('common.transversalUnavailable');
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError(null);
    if (canUse) {
      api
        .getTransversalOptions(projectId, boardId ? { boardId } : {})
        .then((result) => {
          if (!cancelled) setSnapshot({ ...result, requestKey });
        })
        .catch((nextError) => {
          if (!cancelled)
            setError(
              isAccessError(nextError)
                ? 'common.transversalUnavailable'
                : 'common.transversalLoadFailed',
            );
        });
    }
    return () => {
      cancelled = true;
    };
  }, [canUse, projectId, boardId, requestKey]);

  const data = canUse && snapshot?.requestKey === requestKey ? snapshot : null;
  const setFilter = (name, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    if (name === 'board') params.delete('stage');
    setSearchParams(params, { replace: true });
  };
  const stages = data?.items.filter((stage) => !stageKey || stage.key === stageKey) || [];

  let content;
  if (!canUse || error) {
    content = (
      <p className={styles.message} role="alert">
        {t(canUse ? error : 'common.transversalUnavailable')}
      </p>
    );
  } else if (!data) {
    content = (
      <p className={styles.message} role="status">
        {t('common.transversalLoading')}
      </p>
    );
  } else if (!stages.length) {
    content = (
      <p className={styles.message} role="status">
        {t('common.transversalEmpty')}
      </p>
    );
  } else {
    content = (
      <div className={styles.columns}>
        {stages.map((stage) => (
          <Column
            key={`${requestKey}:${stage.key}`}
            projectId={projectId}
            stage={stage}
            boardId={boardId}
            onDenied={onDenied}
          />
        ))}
      </div>
    );
  }

  return (
    <main className={styles.workspace}>
      <div className={styles.toolbar}>
        <h1>{t('common.transversalTitle')}</h1>
        {data && (
          <>
            <label htmlFor="transversal-board">
              {t('common.transversalBoard')}
              <select
                id="transversal-board"
                aria-label={t('common.transversalBoard')}
                value={boardId}
                onChange={(event) => setFilter('board', event.target.value)}
              >
                <option value="">{t('common.transversalAllBoards')}</option>
                {data.included.boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="transversal-stage">
              {t('common.transversalStage')}
              <select
                id="transversal-stage"
                aria-label={t('common.transversalStage')}
                value={stageKey}
                onChange={(event) => setFilter('stage', event.target.value)}
              >
                <option value="">{t('common.transversalAllStages')}</option>
                {stageKey && !data.items.some((stage) => stage.key === stageKey) && (
                  <option value={stageKey}>{stageKey}</option>
                )}
                {data.items.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {canUse && (
          <Button variant="secondary" onClick={refresh}>
            {t('common.transversalRefresh')}
          </Button>
        )}
      </div>
      <p className={styles.hint}>{t('common.transversalHint')}</p>
      {content}
    </main>
  );
});

export default TransversalWorkspace;
