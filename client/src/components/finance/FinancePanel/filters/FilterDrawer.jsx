import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Icon } from 'semantic-ui-react';
import DateFilterTabs from './DateFilterTabs';
import styles from './filters.module.scss';
import popupStyles from '../../../../lib/popup/Popup.module.css';

export default function FilterDrawer({
  open,
  onClose,
  value,
  onChange,
  sortOptions,
  categoryOptions,
  onApply,
}) {
  const [local, setLocal] = useState(value);
  const [activeTab, setActiveTab] = useState('quick');

  useEffect(() => setLocal(value), [value]);

  if (!open) return null;

  const set = (patch) => setLocal((prev) => ({ ...prev, ...patch }));

  const handleQuick = (type) => {
    const now = new Date();
    let patch;
    if (type === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      patch = { startDate: first.toISOString().slice(0, 10), endDate: last.toISOString().slice(0, 10), month: null, year: null };
    } else if (type === 'year') {
      const first = new Date(now.getFullYear(), 0, 1);
      const last = new Date(now.getFullYear(), 11, 31);
      patch = { startDate: first.toISOString().slice(0, 10), endDate: last.toISOString().slice(0, 10), month: null, year: null };
    } else {
      patch = { startDate: null, endDate: null, month: null, year: null };
    }
    
    const updated = { ...local, ...patch };
    setLocal(updated);
    onChange?.(updated);
    onApply?.(updated);
    onClose?.();
  };

  const handleMonthYear = ({ month, year }) => {
    const patch = { month, year };
    if (month && year) {
      const first = new Date(Number(year), Number(month) - 1, 1);
      const last = new Date(Number(year), Number(month), 0);
      patch.startDate = first.toISOString().slice(0, 10);
      patch.endDate = last.toISOString().slice(0, 10);
    }
    set(patch);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h4 style={{ margin: 0 }}>Filtros</h4>
          <button type="button" className={popupStyles.closeButton} onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}><Icon name="calendar" /> Datas</div>
          <DateFilterTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            startDate={local.startDate}
            endDate={local.endDate}
            onChangeRange={(patch) => set(patch)}
            month={local.month}
            year={local.year}
            onChangeMonthYear={handleMonthYear}
            onQuick={handleQuick}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}><Icon name="tag" /> Categoria</div>
          <Dropdown
            placeholder="Todas"
            selection
            clearable
            search
            options={categoryOptions}
            value={local.categoryId || null}
            onChange={(_, { value }) => set({ categoryId: value })}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionLabel}><Icon name="sort" /> Ordenação</div>
          <Dropdown
            selection
            options={sortOptions}
            value={local.sort}
            onChange={(_, { value }) => set({ sort: value })}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => { setLocal(value); onChange?.(value); }}>
            Limpar
          </button>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => { onChange?.(local); onApply?.(local); onClose?.(); }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

FilterDrawer.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  sortOptions: PropTypes.array,
  categoryOptions: PropTypes.array,
  onApply: PropTypes.func,
};


