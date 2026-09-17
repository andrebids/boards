/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import styles from './SavedFiltersStep.module.scss';

const SavedFiltersStep = React.memo(({ items, onApply, onDelete, onClose }) => {
  const [t] = useTranslation();

  const handleApplyClick = useCallback(
    ({
      currentTarget: {
        dataset: { id },
      },
    }) => {
      onApply(id);
      onClose();
    },
    [onApply, onClose]
  );

  const handleDeleteClick = useCallback(
    event => {
      event.stopPropagation();
      onDelete(event.currentTarget.dataset.id);
    },
    [onDelete]
  );

  return (
    <>
      <Popup.Header>
        {t('common.savedFilters', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        {items.length === 0 ? (
          <div className={styles.emptyMessage}>{t('common.noSavedFilters')}</div>
        ) : (
          <Menu secondary vertical className={styles.menu}>
            {items.map(item => (
              <Menu.Item
                key={item.id}
                data-id={item.id}
                className={styles.menuItem}
                onClick={handleApplyClick}
              >
                <Icon name="filter" className={styles.menuItemIcon} />
                <span className={styles.itemName}>{item.name}</span>
                <button
                  type="button"
                  data-id={item.id}
                  aria-label={t('action.delete')}
                  title={t('action.delete')}
                  className={styles.deleteButton}
                  onClick={handleDeleteClick}
                >
                  <Icon fitted name="trash alternate outline" />
                </button>
              </Menu.Item>
            ))}
          </Menu>
        )}
      </Popup.Content>
    </>
  );
});

SavedFiltersStep.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onApply: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SavedFiltersStep;
