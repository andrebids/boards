/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';
import { useDidUpdate } from '../../../lib/hooks';
import { usePopup } from '../../../lib/popup';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { BoardViews, MediaTypeFilters } from '../../../constants/Enums';
import { useNestedRef } from '../../../hooks';
import {
  addSavedFilter,
  readSavedFilters,
  removeSavedFilter,
} from '../../../utils/saved-filters';
import UserAvatar from '../../users/UserAvatar';
import BoardMembershipsStep from '../../board-memberships/BoardMembershipsStep';
import LabelChip from '../../labels/LabelChip';
import LabelsStep from '../../labels/LabelsStep';
import SaveFilterStep from './SaveFilterStep';
import SavedFiltersStep from './SavedFiltersStep';

import styles from './Filters.module.scss';

const MEDIA_TYPE_FILTERS = [
  { key: MediaTypeFilters.IMAGES, labelKey: 'common.images', icon: 'image' },
  { key: MediaTypeFilters.VIDEOS, labelKey: 'common.videos', icon: 'film' },
  {
    key: MediaTypeFilters.DOCUMENTS,
    labelKey: 'common.documents',
    icon: 'file text',
  },
  { key: MediaTypeFilters.LINKS, labelKey: 'common.links', icon: 'linkify' },
  { key: MediaTypeFilters.OTHERS, labelKey: 'common.others', icon: 'attach' },
];

const Filters = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const userIds = useSelector(selectors.selectFilterUserIdsForCurrentBoard);
  const labelIds = useSelector(selectors.selectFilterLabelIdsForCurrentBoard);
  const currentUserId = useSelector(selectors.selectCurrentUserId);
  const memberUserIds = useSelector(selectors.selectMemberUserIdsForCurrentBoard);
  const boardLabels = useSelector(selectors.selectLabelsForCurrentBoard);

  const withCurrentUserSelector = useSelector(
    state => !!selectors.selectCurrentUserMembershipForCurrentBoard(state)
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [search, setSearch] = useState(board.search);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [savedFilters, setSavedFilters] = useState(() =>
    readSavedFilters(currentUserId, board.id)
  );

  const mediaTypeFilter = board.mediaTypeFilter || [];

  const handleMediaTypeFilterReset = useCallback(() => {
    dispatch(entryActions.updateMediaTypeFilterInCurrentBoard([]));
  }, [dispatch]);

  const handleMediaTypeFilterToggle = useCallback(
    ({ currentTarget: { value: mediaType } }) => {
      const current = board.mediaTypeFilter || [];

      dispatch(
        entryActions.updateMediaTypeFilterInCurrentBoard(
          current.includes(mediaType)
            ? current.filter(item => item !== mediaType)
            : [...current, mediaType]
        )
      );
    },
    [board.mediaTypeFilter, dispatch]
  );

  const debouncedSearch = useMemo(
    () =>
      debounce(nextSearch => {
        dispatch(entryActions.searchInCurrentBoard(nextSearch));
      }, 400),
    [dispatch]
  );

  const [searchFieldRef, handleSearchFieldRef] = useNestedRef('inputRef');

  const cancelSearch = useCallback(() => {
    debouncedSearch.cancel();
    setSearch('');
    dispatch(entryActions.searchInCurrentBoard(''));
    searchFieldRef.current.blur();
  }, [dispatch, debouncedSearch, searchFieldRef]);

  const handleUserSelect = useCallback(
    userId => {
      dispatch(entryActions.addUserToFilterInCurrentBoard(userId));
    },
    [dispatch]
  );

  const handleCurrentUserSelect = useCallback(() => {
    dispatch(entryActions.addUserToFilterInCurrentBoard(currentUserId));
  }, [currentUserId, dispatch]);

  const handleUserDeselect = useCallback(
    userId => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
    },
    [dispatch]
  );

  const handleUserClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: userId },
      },
    }) => {
      dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
    },
    [dispatch]
  );

  const handleLabelSelect = useCallback(
    labelId => {
      dispatch(entryActions.addLabelToFilterInCurrentBoard(labelId));
    },
    [dispatch]
  );

  const handleLabelDeselect = useCallback(
    labelId => {
      dispatch(entryActions.removeLabelFromFilterInCurrentBoard(labelId));
    },
    [dispatch]
  );

  const handleLabelClick = useCallback(
    ({
      currentTarget: {
        dataset: { id: labelId },
      },
    }) => {
      dispatch(entryActions.removeLabelFromFilterInCurrentBoard(labelId));
    },
    [dispatch]
  );

  const handleSearchChange = useCallback(
    (_, { value }) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  const handleSearchKeyDown = useCallback(
    event => {
      if (event.key === 'Escape') {
        cancelSearch();
      }
    },
    [cancelSearch]
  );

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
  }, []);

  const handleCancelSearchClick = useCallback(() => {
    cancelSearch();
  }, [cancelSearch]);

  const handleFilterSave = useCallback(
    name => {
      setSavedFilters(
        addSavedFilter(currentUserId, board.id, {
          name,
          userIds,
          labelIds,
          search: board.search,
        })
      );
    },
    [board.id, board.search, currentUserId, labelIds, userIds]
  );

  const handleFilterDelete = useCallback(
    filterId => {
      setSavedFilters(removeSavedFilter(currentUserId, board.id, filterId));
    },
    [board.id, currentUserId]
  );

  const handleFilterApply = useCallback(
    filterId => {
      const savedFilter = savedFilters.find(item => item.id === filterId);

      if (!savedFilter) {
        return;
      }

      // Membros e etiquetas podem ter sido removidos depois de o filtro ser guardado
      const nextUserIds = savedFilter.userIds.filter(userId =>
        (memberUserIds || []).includes(userId)
      );

      const nextLabelIds = savedFilter.labelIds.filter(labelId =>
        (boardLabels || []).some(label => label.id === labelId)
      );

      userIds
        .filter(userId => !nextUserIds.includes(userId))
        .forEach(userId => {
          dispatch(entryActions.removeUserFromFilterInCurrentBoard(userId));
        });

      nextUserIds
        .filter(userId => !userIds.includes(userId))
        .forEach(userId => {
          dispatch(entryActions.addUserToFilterInCurrentBoard(userId));
        });

      labelIds
        .filter(labelId => !nextLabelIds.includes(labelId))
        .forEach(labelId => {
          dispatch(entryActions.removeLabelFromFilterInCurrentBoard(labelId));
        });

      nextLabelIds
        .filter(labelId => !labelIds.includes(labelId))
        .forEach(labelId => {
          dispatch(entryActions.addLabelToFilterInCurrentBoard(labelId));
        });

      debouncedSearch.cancel();
      setSearch(savedFilter.search);
      dispatch(entryActions.searchInCurrentBoard(savedFilter.search));
    },
    [
      boardLabels,
      debouncedSearch,
      dispatch,
      labelIds,
      memberUserIds,
      savedFilters,
      userIds,
    ]
  );

  useEffect(() => {
    setSavedFilters(readSavedFilters(currentUserId, board.id));
  }, [board.id, currentUserId]);

  useDidUpdate(() => {
    setSearch(board.search);
  }, [board.search]);

  const BoardMembershipsPopup = usePopup(BoardMembershipsStep);
  const LabelsPopup = usePopup(LabelsStep);
  const SavedFiltersPopup = usePopup(SavedFiltersStep);
  const SaveFilterPopup = usePopup(SaveFilterStep);

  const isSearchActive = search || isSearchFocused;

  const isFilterActive =
    userIds.length > 0 || labelIds.length > 0 || !!(board.search || '').trim();

  return (
    <>
      <span className={styles.filtersLabel}>{t('common.filters')}</span>
      <span className={styles.filter}>
        <BoardMembershipsPopup
          currentUserIds={userIds}
          title="common.filterByMembers"
          onUserSelect={handleUserSelect}
          onUserDeselect={handleUserDeselect}
        >
          <button type="button" className={styles.filterButtonClickable}>
            <span className={styles.filterLabel}>
              {userIds.length === 0 ? t('common.members') : `${t('common.members')} (${userIds.length})`}
              <Icon name="chevron down" className={styles.dropdownIcon} />
            </span>
          </button>
        </BoardMembershipsPopup>
        {userIds.map(userId => (
          <span key={userId} className={styles.filterItem}>
            <UserAvatar id={userId} size="tiny" onClick={handleUserClick} />
          </span>
        ))}
      </span>
      <span className={styles.filter}>
        <LabelsPopup
          currentIds={labelIds}
          title="common.filterByLabels"
          onSelect={handleLabelSelect}
          onDeselect={handleLabelDeselect}
        >
          <button type="button" className={styles.filterButtonClickable}>
            <span className={styles.filterLabel}>
              {labelIds.length === 0 ? t('common.labels') : `${t('common.labels')} (${labelIds.length})`}
              <Icon name="chevron down" className={styles.dropdownIcon} />
            </span>
          </button>
        </LabelsPopup>
        {labelIds.map(labelId => (
          <span key={labelId} className={styles.filterItem}>
            <LabelChip id={labelId} size="small" onClick={handleLabelClick} />
          </span>
        ))}
      </span>
      <span className={styles.filter}>
        <Input
          ref={handleSearchFieldRef}
          value={search}
          placeholder={t('common.searchCards')}
          maxLength={128}
          icon={
            isSearchActive ? (
              <Icon link name="cancel" onClick={handleCancelSearchClick} />
            ) : (
              'search'
            )
          }
          className={classNames(
            styles.search,
            !isSearchActive && styles.searchInactive
          )}
          onFocus={handleSearchFocus}
          onKeyDown={handleSearchKeyDown}
          onChange={handleSearchChange}
          onBlur={handleSearchBlur}
        />
      </span>
      {board.view === BoardViews.MEDIA && (
        <span className={styles.filter}>
          <button
            type="button"
            title={t('common.all')}
            aria-pressed={mediaTypeFilter.length === 0}
            className={classNames(
              styles.filterButtonClickable,
              mediaTypeFilter.length === 0 && styles.filterButtonActive
            )}
            onClick={handleMediaTypeFilterReset}
          >
            <span className={styles.filterLabel}>
              <Icon fitted name="block layout" className={styles.filterLabelIcon} />
              {t('common.all')}
            </span>
          </button>
          {MEDIA_TYPE_FILTERS.map(({ key, labelKey, icon }) => {
            const isActive = mediaTypeFilter.includes(key);

            return (
              <button
                key={key}
                type="button"
                value={key}
                title={t(labelKey)}
                aria-pressed={isActive}
                className={classNames(
                  styles.filterButtonClickable,
                  isActive && styles.filterButtonActive
                )}
                onClick={handleMediaTypeFilterToggle}
              >
                <span className={styles.filterLabel}>
                  <Icon fitted name={icon} className={styles.filterLabelIcon} />
                  {t(labelKey)}
                </span>
              </button>
            );
          })}
        </span>
      )}
      <span className={styles.filter}>
        <SavedFiltersPopup
          items={savedFilters}
          onApply={handleFilterApply}
          onDelete={handleFilterDelete}
        >
          <button
            type="button"
            title={t('common.savedFilters')}
            className={styles.filterButtonClickable}
          >
            <span className={styles.filterLabel}>
              <Icon fitted name="bookmark outline" />
              {savedFilters.length > 0 && ` (${savedFilters.length})`}
            </span>
          </button>
        </SavedFiltersPopup>
        {isFilterActive && (
          <SaveFilterPopup onCreate={handleFilterSave}>
            <button type="button" className={styles.filterButtonClickable}>
              <span className={styles.filterLabel}>{t('action.save')}</span>
            </button>
          </SaveFilterPopup>
        )}
      </span>
    </>
  );
});

export default Filters;
