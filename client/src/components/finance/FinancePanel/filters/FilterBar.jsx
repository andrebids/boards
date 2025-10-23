import React from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';
import ActiveChips from './ActiveChips';
import styles from './filters.module.scss';

export default function FilterBar({ filters, resultsText, onOpen, onClear, onRemoveChip }) {
  const activeCount = [
    filters.startDate || filters.endDate ? 1 : 0,
    filters.month || filters.year ? 1 : 0,
    filters.categoryId && filters.categoryId !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <ActiveChips filters={filters} onRemove={onRemoveChip} />
      </div>
      <div className={styles.right}>
        <button type="button" className={styles.button} onClick={onOpen} aria-expanded="false">
          <Icon name="filter" /> Filtros
          {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
        </button>
        {resultsText && <div className={styles.results}>{resultsText}</div>}
        {activeCount > 0 && (
          <button type="button" className={styles.button} onClick={onClear}>
            <Icon name="redo" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

FilterBar.propTypes = {
  filters: PropTypes.shape({
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    month: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    categoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  resultsText: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onRemoveChip: PropTypes.func,
};


