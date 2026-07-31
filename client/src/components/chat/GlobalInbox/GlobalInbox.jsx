import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCheck, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import selectors from '../../../selectors';
import GlobalInboxRow from '../GlobalInboxRow';

import styles from './GlobalInbox.module.scss';

const FILTERS = ['unread', 'mentions', 'all'];
const INBOX_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 250;

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const GlobalInbox = React.memo(({ onOpenConversation }) => {
  const [t] = useTranslation();
  const dispatch = useDispatch();
  const items = useSelector(selectors.selectChatInboxItems);
  const unreadTotal = useSelector(selectors.selectChatInboxUnreadConversationTotal) || 0;
  const isFetching = useSelector(selectors.selectIsChatInboxFetching);
  const isFetchingMore = useSelector(selectors.selectIsChatInboxFetchingMore);
  const hasFetched = useSelector(selectors.selectHasFetchedChatInbox);
  const error = useSelector(selectors.selectChatInboxError);
  const inboxMeta = useSelector(selectors.selectChatInboxMeta);
  const hasChosenFilterRef = useRef(false);
  const [filter, setFilter] = useState('unread');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    dispatch(
      entryActions.fetchChatInbox({
        filter,
        query: debouncedQuery,
        limit: INBOX_PAGE_SIZE,
      }),
    );
  }, [debouncedQuery, dispatch, filter]);

  useEffect(() => {
    if (
      hasFetched &&
      !hasChosenFilterRef.current &&
      filter === 'unread' &&
      !query.trim() &&
      unreadTotal === 0
    ) {
      setFilter('all');
    }
  }, [filter, hasFetched, query, unreadTotal]);

  const mentionTotal = useMemo(
    () =>
      typeof inboxMeta.unreadMentionConversationTotal === 'number'
        ? inboxMeta.unreadMentionConversationTotal
        : items.filter((item) => item.hasUnreadMention && item.unreadCount > 0).length,
    [inboxMeta.unreadMentionConversationTotal, items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(debouncedQuery);

    return items.filter((item) => {
      if (filter === 'unread' && !(item.unreadCount > 0)) return false;
      if (filter === 'mentions' && !(item.hasUnreadMention && item.unreadCount > 0)) return false;

      if (!normalizedQuery) return true;

      const searchableText = [item.title, item.projectName, item.lastMessage?.text]
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [debouncedQuery, filter, items]);

  const handleMarkAsRead = useCallback(
    (conversationId) => {
      dispatch(entryActions.markChatConversationAsRead(conversationId));
    },
    [dispatch],
  );

  const handleRetry = useCallback(() => {
    dispatch(
      entryActions.fetchChatInbox({
        filter,
        query: debouncedQuery,
        limit: INBOX_PAGE_SIZE,
      }),
    );
  }, [debouncedQuery, dispatch, filter]);

  const handleFilterChange = useCallback((nextFilter) => {
    hasChosenFilterRef.current = true;
    setFilter(nextFilter);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadTotal > 0) {
      dispatch(entryActions.markAllChatInboxAsRead());
    }
  }, [dispatch, unreadTotal]);

  const handleLoadMore = useCallback(() => {
    if (!inboxMeta.nextCursor || isFetchingMore) return;

    dispatch(
      entryActions.fetchChatInbox({
        filter,
        query: debouncedQuery,
        before: inboxMeta.nextCursor,
        limit: INBOX_PAGE_SIZE,
        append: true,
      }),
    );
  }, [debouncedQuery, dispatch, filter, inboxMeta.nextCursor, isFetchingMore]);

  const handleFilterKeyDown = useCallback((event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = FILTERS.length - 1;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + FILTERS.length) % FILTERS.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % FILTERS.length;

    hasChosenFilterRef.current = true;
    setFilter(FILTERS[nextIndex]);
    document.getElementById(`chat-inbox-filter-${FILTERS[nextIndex]}`)?.focus();
  }, []);

  const showInitialLoading = isFetching && !hasFetched;
  const showInitialError = Boolean(error) && !hasFetched;
  const hasQuery = Boolean(debouncedQuery);

  let contentNode;
  if (showInitialLoading) {
    contentNode = (
      <div className={styles.skeletons} aria-label={t('chat.loadingGlobalInbox')} role="status">
        {[0, 1, 2, 3].map((index) => (
          <div className={styles.skeleton} key={index} aria-hidden="true">
            <span />
            <span>
              <i />
              <i />
              <i />
            </span>
          </div>
        ))}
      </div>
    );
  } else if (showInitialError) {
    contentNode = (
      <div className={styles.state} role="alert">
        <span className={styles.stateIcon}>
          <RefreshCw aria-hidden="true" size={20} strokeWidth={1.9} />
        </span>
        <strong>{t('chat.globalInboxErrorTitle')}</strong>
        <p>{t('chat.globalInboxErrorDescription')}</p>
        <button type="button" onClick={handleRetry}>
          {t('chat.retry')}
        </button>
      </div>
    );
  } else if (filteredItems.length > 0) {
    contentNode = filteredItems.map((item) => (
      <GlobalInboxRow
        key={`${item.projectId}:${item.conversationId}`}
        item={item}
        onMarkAsRead={handleMarkAsRead}
        onOpen={onOpenConversation}
      />
    ));
  } else {
    let title = t('chat.globalInboxEmptyTitle');
    let description = t('chat.globalInboxEmptyDescription');
    if (hasQuery) {
      title = t('chat.noGlobalConversationsFound');
      description = t('chat.tryAnotherSearch');
    } else if (filter === 'unread' && inboxMeta.conversationTotal > 0) {
      title = t('chat.globalInboxReadTitle');
      description = t('chat.globalInboxReadDescription');
    } else if (filter === 'mentions' && inboxMeta.conversationTotal > 0) {
      title = t('chat.noUnreadMentionsTitle');
      description = t('chat.noUnreadMentionsDescription');
    }

    contentNode = (
      <div className={styles.state}>
        <span className={styles.stateIcon}>
          <MessageCircle aria-hidden="true" size={21} strokeWidth={1.9} />
        </span>
        <strong>{title}</strong>
        <p>{description}</p>
        {!hasQuery && filter !== 'all' && inboxMeta.conversationTotal > 0 && (
          <button type="button" onClick={() => handleFilterChange('all')}>
            {t('chat.viewAllConversations')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.inbox}>
      <label className={styles.search} htmlFor="chat-global-inbox-search">
        <Search aria-hidden="true" size={15} strokeWidth={2} />
        <input
          id="chat-global-inbox-search"
          type="search"
          value={query}
          placeholder={t('chat.searchAllConversations')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className={styles.filters} role="tablist" aria-label={t('chat.globalInboxFilters')}>
        {FILTERS.map((filterId, index) => {
          const count = filterId === 'unread' ? unreadTotal : mentionTotal;
          return (
            <button
              type="button"
              role="tab"
              key={filterId}
              id={`chat-inbox-filter-${filterId}`}
              aria-controls="chat-global-inbox-results"
              aria-selected={filter === filterId}
              tabIndex={filter === filterId ? 0 : -1}
              className={filter === filterId ? styles.activeFilter : ''}
              onClick={() => handleFilterChange(filterId)}
              onKeyDown={(event) => handleFilterKeyDown(event, index)}
            >
              {t(`chat.globalInboxFilter${filterId[0].toUpperCase()}${filterId.slice(1)}`)}
              {filterId !== 'all' && count > 0 && <span>{count > 99 ? '99+' : count}</span>}
            </button>
          );
        })}
      </div>
      {unreadTotal > 1 && (
        <div className={styles.bulkActions}>
          <button type="button" onClick={handleMarkAllAsRead}>
            <CheckCheck aria-hidden="true" size={14} strokeWidth={2.2} />
            {t('chat.markAllAsRead')}
          </button>
        </div>
      )}
      <div
        id="chat-global-inbox-results"
        className={styles.results}
        role="tabpanel"
        aria-busy={isFetching || isFetchingMore}
        aria-live="polite"
        aria-labelledby={`chat-inbox-filter-${filter}`}
      >
        {contentNode}
        {hasFetched && filteredItems.length > 0 && inboxMeta.hasMore && (
          <div className={styles.pagination}>
            <button type="button" disabled={isFetchingMore} onClick={handleLoadMore}>
              {isFetchingMore && (
                <RefreshCw
                  aria-hidden="true"
                  className={styles.loadingIcon}
                  size={14}
                  strokeWidth={2}
                />
              )}
              {t(isFetchingMore ? 'chat.loadingOlderConversations' : 'chat.loadOlderConversations')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

GlobalInbox.propTypes = {
  onOpenConversation: PropTypes.func.isRequired,
};

export default GlobalInbox;
