/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Menu } from 'semantic-ui-react';
import { Button, Input, Popup } from '../../../lib/custom-ui';

import { useField, useNestedRef } from '../../../hooks';
import Item from './Item';

import styles from './PureBoardMembershipsStep.module.scss';

const PureBoardMembershipsStep = React.memo(
  ({
    items,
    currentUserIds,
    title,
    clearButtonContent,
    onUserSelect,
    onUserDeselect,
    onClear,
    onBack,
  }) => {
    const [t] = useTranslation();
    const [search, handleSearchChange, setSearch] = useField('');
    const cleanSearch = useMemo(() => search.trim().toLowerCase(), [search]);

    const filteredItems = useMemo(
      () =>
        items.filter(
          ({ user }) =>
            (user.name && user.name.toLowerCase().includes(cleanSearch)) ||
            (user.username && user.username.toLowerCase().includes(cleanSearch)) ||
            (user.email && user.email.toLowerCase().includes(cleanSearch)),
        ),
      [items, cleanSearch],
    );

    const [searchFieldRef, handleSearchFieldRef] = useNestedRef('inputRef');

    useEffect(() => {
      searchFieldRef.current.focus({
        preventScroll: true,
      });
    }, [searchFieldRef]);

    const handleSearchClear = useCallback(() => {
      setSearch('');
      searchFieldRef.current.focus({
        preventScroll: true,
      });
    }, [searchFieldRef, setSearch]);

    return (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <div className={styles.searchField}>
            <Search aria-hidden="true" className={styles.searchIcon} size={16} strokeWidth={2} />
            <Input
              fluid
              ref={handleSearchFieldRef}
              aria-label={t('common.searchMembers')}
              className={styles.searchInput}
              value={search}
              placeholder={t('common.searchMembers')}
              maxLength={128}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                type="button"
                aria-label={t('action.clear')}
                className={styles.clearSearchButton}
                onClick={handleSearchClear}
              >
                <X aria-hidden="true" size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
          {filteredItems.length > 0 && (
            <Menu secondary vertical className={styles.menu}>
              {filteredItems.map((boardMembership) => (
                <Item
                  key={boardMembership.id}
                  user={boardMembership.user}
                  isActive={currentUserIds.includes(boardMembership.user.id)}
                  isDisabled={boardMembership.isPersisted === false}
                  onUserSelect={onUserSelect}
                  onUserDeselect={onUserDeselect}
                />
              ))}
            </Menu>
          )}
          {filteredItems.length === 0 && (
            <div className={styles.emptyState} role="status">
              <span className={styles.emptyStateIcon}>
                <Search aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <span>{t('chat.noMembersFound')}</span>
            </div>
          )}
          {currentUserIds.length > 0 && onClear && (
            <Button variant="secondary"
              fluid
              content={t(clearButtonContent)}
              className={styles.clearButton}
              onClick={onClear}
            />
          )}
        </Popup.Content>
      </>
    );
  },
);

PureBoardMembershipsStep.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  items: PropTypes.array.isRequired,
  currentUserIds: PropTypes.array,
  /* eslint-enable react/forbid-prop-types */
  title: PropTypes.string,
  clearButtonContent: PropTypes.string,
  onUserSelect: PropTypes.func.isRequired,
  onUserDeselect: PropTypes.func,
  onClear: PropTypes.func,
  onBack: PropTypes.func,
};

PureBoardMembershipsStep.defaultProps = {
  currentUserIds: [],
  title: 'common.members',
  clearButtonContent: 'action.clear',
  onUserDeselect: undefined,
  onClear: undefined,
  onBack: undefined,
};

export default PureBoardMembershipsStep;
