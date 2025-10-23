/*
 * ActiveChips: renders removable chips derived from filters object
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'semantic-ui-react';

import styles from './filters.module.scss';

const formatDate = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('pt-PT');
  } catch (_) {
    return value;
  }
};

export default function ActiveChips({ filters, onRemove }) {
  const chips = [];

  if (filters.startDate || filters.endDate) {
    const text = `${formatDate(filters.startDate)} — ${formatDate(filters.endDate)}`;
    chips.push({ key: 'range', label: text });
  }

  if (filters.month || filters.year) {
    const monthNames = [
      '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    const text = `${filters.month ? monthNames[Number(filters.month)] : ''} ${filters.year || ''}`.trim();
    if (text) chips.push({ key: 'monthYear', label: text });
  }

  // Only show category chip when a specific category is selected; hide for "all"
  if (filters.categoryId && filters.categoryId !== 'all') {
    chips.push({ key: 'category', label: filters.categoryId });
  }

  if (chips.length === 0) return null;

  return (
    <div className={styles.chips}>
      {chips.map((chip) => (
        <span key={chip.key} className={styles.chip}>
          {chip.label}
          <button
            className={styles.chipRemove}
            type="button"
            onClick={() => onRemove?.(chip.key)}
            aria-label="Remover filtro"
            title="Remover filtro"
          >
            <Icon name="close" />
          </button>
        </span>
      ))}
    </div>
  );
}

ActiveChips.propTypes = {
  filters: PropTypes.shape({
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    month: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    categoryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onRemove: PropTypes.func,
};


