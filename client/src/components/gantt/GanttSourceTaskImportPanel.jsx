/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Icon, Loader } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { Button } from '../../lib/custom-ui';
import UserAvatar from '../users/UserAvatar';
import { useGantt } from './GanttContext';

import styles from './GanttSourceTaskImportPanel.module.scss';

const GanttSourceTaskImportPanel = React.memo(({ onImported, onOpenItem, onClose }) => {
  const { getSourceTasks, importSourceTasks } = useGantt();
  const [sourceTasks, setSourceTasks] = useState([]);
  const [sourceCards, setSourceCards] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [search, setSearch] = useState('');
  const [boardId, setBoardId] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const [t] = useTranslation();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const body = await getSourceTasks({
        search: search.trim() || undefined,
        boardId: boardId || undefined,
        includeCompleted,
      });
      setSourceTasks(body.items || []);
      setSourceCards(body.cards || []);
      setBoards(body.included?.boards || []);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, getSourceTasks, includeCompleted, search]);

  useEffect(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 180);
    return () => clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = [
        ...panelRef.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ].filter((element) => element.offsetParent !== null);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const groupedSources = useMemo(() => {
    const result = [];
    sourceCards.forEach((card) => {
      let board = result.find(({ id }) => id === card.boardId);
      if (!board) {
        board = { id: card.boardId, name: card.boardName, cards: [] };
        result.push(board);
      }
      let groupedCard = board.cards.find(({ id }) => id === card.id);
      if (!groupedCard) {
        groupedCard = { id: card.id, name: card.name, card, tasks: [] };
        board.cards.push(groupedCard);
      }
    });
    sourceTasks.forEach((task) => {
      let board = result.find(({ id }) => id === task.boardId);
      if (!board) {
        board = { id: task.boardId, name: task.boardName, cards: [] };
        result.push(board);
      }
      let card = board.cards.find(({ id }) => id === task.cardId);
      if (!card) {
        card = { id: task.cardId, name: task.cardName, tasks: [] };
        board.cards.push(card);
      }
      card.tasks.push(task);
    });
    return result;
  }, [sourceCards, sourceTasks]);

  const handleSourceToggle = useCallback((source) => {
    setSelectedSources((current) =>
      current.includes(source.key)
        ? current.filter((key) => key !== source.key)
        : [...current, source.key],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedSources.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      const taskIds = selectedSources
        .filter((key) => key.startsWith('task:'))
        .map((key) => key.slice(5));
      const cardIds = selectedSources
        .filter((key) => key.startsWith('card:'))
        .map((key) => key.slice(5));
      const body = await importSourceTasks({ taskIds, cardIds });
      toast.success(
        t('common.ganttSourceTasksImported', {
          count: selectedSources.length,
        }),
      );
      onImported(body.items);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setIsSubmitting(false);
    }
  }, [importSourceTasks, onImported, selectedSources, t]);

  const renderTaskAccessory = (task) => {
    if (task.ganttItemId) {
      return (
        <Button size="sm" variant="tertiary" onClick={() => onOpenItem(task.ganttItemId)}>
          {t('common.ganttOpenLinkedTask')}
        </Button>
      );
    }
    if (task.isCompleted) {
      return <span className={styles.completed}>{t('common.ganttStatus_completed')}</span>;
    }
    return null;
  };

  let resultsContent;
  if (isLoading) {
    resultsContent = (
      <div className={styles.state}>
        <Loader active inverted inline="centered" />
      </div>
    );
  } else if (error) {
    resultsContent = (
      <div className={styles.state} role="alert">
        <Icon name="warning circle" />
        <span>{t('common.ganttSourceTasksLoadFailed')}</span>
        <Button size="sm" variant="secondary" onClick={load}>
          {t('action.retry')}
        </Button>
      </div>
    );
  } else if (groupedSources.length === 0) {
    resultsContent = (
      <div className={styles.state}>
        <Icon name="search" />
        <span>{t('common.ganttNoBoardTasksFound')}</span>
      </div>
    );
  } else {
    resultsContent = groupedSources.map((board) => (
      <section key={board.id} className={styles.boardGroup}>
        <h3>{board.name}</h3>
        {board.cards.map((card) => (
          <div key={card.id} className={styles.cardGroup}>
            <strong>{card.name}</strong>
            {card.card && (
              <div className={styles.taskRow}>
                <input
                  type="checkbox"
                  className={styles.taskCheckbox}
                  aria-label={card.name}
                  checked={selectedSources.includes(`card:${card.id}`)}
                  disabled={Boolean(card.card.ganttItemId)}
                  onChange={() =>
                    handleSourceToggle({ key: `card:${card.id}`, id: card.id })
                  }
                />
                <button
                  type="button"
                  className={styles.taskMain}
                  disabled={Boolean(card.card.ganttItemId)}
                  onClick={() => handleSourceToggle({ key: `card:${card.id}`, id: card.id })}
                >
                  <span>{t('common.ganttImportCard')}</span>
                  <small>{card.card.listName}</small>
                </button>
                {card.card.ganttItemId && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => onOpenItem(card.card.ganttItemId)}
                  >
                    {t('common.ganttOpenLinkedTask')}
                  </Button>
                )}
              </div>
            )}
            {card.tasks.map((task) => (
              <div key={task.id} className={styles.taskRow}>
                <input
                  type="checkbox"
                  className={styles.taskCheckbox}
                  aria-label={task.name}
                  checked={selectedSources.includes(`task:${task.id}`)}
                  disabled={Boolean(task.ganttItemId)}
                  onChange={() => handleSourceToggle({ key: `task:${task.id}`, id: task.id })}
                />
                <button
                  type="button"
                  className={styles.taskMain}
                  disabled={Boolean(task.ganttItemId)}
                  onClick={() => handleSourceToggle({ key: `task:${task.id}`, id: task.id })}
                >
                  <span>{task.name}</span>
                  <small>{task.taskListName}</small>
                </button>
                {task.assigneeUserId && <UserAvatar id={task.assigneeUserId} size="tiny" />}
                {renderTaskAccessory(task)}
              </div>
            ))}
          </div>
        ))}
      </section>
    ));
  }

  return (
    <aside
      ref={panelRef}
      className={styles.panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gantt-import-panel-title"
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t('common.ganttPlanningEyebrow')}</span>
          <h2 id="gantt-import-panel-title">{t('common.ganttImportFromBoards')}</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label={t('action.close')}
          onClick={onClose}
        >
          <Icon fitted name="close" aria-hidden="true" />
        </button>
      </header>

      <div className={styles.body}>
        <label className={styles.field} htmlFor="gantt-source-search">
          <span>{t('common.search')}</span>
          <div className={styles.searchField}>
            <Icon name="search" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="gantt-source-search"
              value={search}
              placeholder={t('common.ganttSearchBoardTasks')}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
        </label>

        <div className={styles.filters}>
          <div className={styles.field}>
            <span id="gantt-source-board-label">{t('common.board')}</span>
            <Dropdown
              fluid
              selection
              id="gantt-source-board"
              value={boardId}
              options={[
                { key: '', text: t('common.allBoards'), value: '' },
                ...boards.map((board) => ({
                  key: board.id,
                  text: board.name,
                  value: board.id,
                })),
              ]}
              aria-labelledby="gantt-source-board-label"
              onChange={(event, { value }) => setBoardId(value)}
            />
          </div>
          <label className={styles.checkboxField} htmlFor="gantt-source-completed">
            <input
              id="gantt-source-completed"
              type="checkbox"
              checked={includeCompleted}
              onChange={(event) => setIncludeCompleted(event.currentTarget.checked)}
            />
            <span>{t('common.ganttIncludeCompleted')}</span>
          </label>
        </div>

        <div className={styles.results} aria-live="polite" aria-busy={isLoading}>
          {resultsContent}
        </div>

        <footer className={styles.footer}>
          <span>
            {t('common.ganttSelectedTaskCount', {
              count: selectedSources.length,
            })}
          </span>
          <Button size="sm" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={isSubmitting}
            disabled={selectedSources.length === 0}
            onClick={handleSubmit}
          >
            {t('common.ganttAddSelectedTasks')}
          </Button>
        </footer>
      </div>
    </aside>
  );
});

GanttSourceTaskImportPanel.propTypes = {
  onImported: PropTypes.func.isRequired,
  onOpenItem: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default GanttSourceTaskImportPanel;
