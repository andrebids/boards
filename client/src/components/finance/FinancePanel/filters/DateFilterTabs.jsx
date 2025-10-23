import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Input, Dropdown } from 'semantic-ui-react';
import styles from './filters.module.scss';

export default function DateFilterTabs({
  activeTab,
  onTabChange,
  startDate,
  endDate,
  onChangeRange,
  month,
  year,
  onChangeMonthYear,
  onQuick,
}) {
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const arr = [];
    for (let i = current - 5; i <= current + 1; i++) {
      arr.push({ key: String(i), value: String(i), text: String(i) });
    }
    return arr;
  }, []);

  const monthOptions = [
    { key: '1', value: '1', text: 'Janeiro' },
    { key: '2', value: '2', text: 'Fevereiro' },
    { key: '3', value: '3', text: 'Março' },
    { key: '4', value: '4', text: 'Abril' },
    { key: '5', value: '5', text: 'Maio' },
    { key: '6', value: '6', text: 'Junho' },
    { key: '7', value: '7', text: 'Julho' },
    { key: '8', value: '8', text: 'Agosto' },
    { key: '9', value: '9', text: 'Setembro' },
    { key: '10', value: '10', text: 'Outubro' },
    { key: '11', value: '11', text: 'Novembro' },
    { key: '12', value: '12', text: 'Dezembro' },
  ];

  return (
    <div>
      <div className={styles.tabsHeader} role="tablist">
        <button
          type="button"
          role="tab"
          className={`${styles.tabBtn} ${activeTab === 'quick' ? styles.tabBtnActive : ''}`}
          onClick={() => onTabChange('quick')}
        >
          Rápido
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tabBtn} ${activeTab === 'monthYear' ? styles.tabBtnActive : ''}`}
          onClick={() => onTabChange('monthYear')}
        >
          Mês/Ano
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tabBtn} ${activeTab === 'range' ? styles.tabBtnActive : ''}`}
          onClick={() => onTabChange('range')}
        >
          Intervalo
        </button>
      </div>

      {activeTab === 'quick' && (
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={() => onQuick('month')}>
            Este Mês
          </button>
          <button type="button" className={styles.button} onClick={() => onQuick('year')}>
            Este Ano
          </button>
          <button type="button" className={styles.button} onClick={() => onQuick('custom')}>
            Personalizado
          </button>
        </div>
      )}

      {activeTab === 'monthYear' && (
        <div className={styles.row}>
          <Dropdown
            placeholder="Mês"
            selection
            options={monthOptions}
            value={month || null}
            onChange={(_, { value }) => onChangeMonthYear({ month: value, year })}
          />
          <Dropdown
            placeholder="Ano"
            selection
            options={yearOptions}
            value={year || null}
            onChange={(_, { value }) => onChangeMonthYear({ month, year: value })}
          />
        </div>
      )}

      {activeTab === 'range' && (
        <div className={styles.row}>
          <Input type="date" value={startDate || ''} onChange={(e) => onChangeRange({ startDate: e.target.value, endDate })} />
          <span className={styles.sepText}>até</span>
          <Input type="date" value={endDate || ''} onChange={(e) => onChangeRange({ startDate, endDate: e.target.value })} />
        </div>
      )}
    </div>
  );
}

DateFilterTabs.propTypes = {
  activeTab: PropTypes.oneOf(['quick', 'monthYear', 'range']).isRequired,
  onTabChange: PropTypes.func.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
  onChangeRange: PropTypes.func.isRequired,
  month: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChangeMonthYear: PropTypes.func.isRequired,
  onQuick: PropTypes.func.isRequired,
};


