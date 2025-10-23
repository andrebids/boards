/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button } from 'semantic-ui-react';

import selectors from '../../../selectors';
import actions from '../../../actions';

import styles from './OverviewTab.module.scss';

const OverviewTab = React.memo(({ projectId }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const financeConfig = useSelector(selectors.selectFinanceConfig);
  const stats = useSelector(selectors.selectFinanceStats);

  const [budget, setBudget] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (financeConfig) {
      setBudget(financeConfig.budget?.toString() || '0');
    }
  }, [financeConfig]);

  const handleBudgetChange = useCallback((e) => {
    setBudget(e.target.value);
  }, []);

  const handleBudgetSave = useCallback(() => {
    const budgetValue = parseFloat(budget) || 0;
    dispatch(
      actions.updateFinanceConfig(projectId, {
        budget: budgetValue,
        currency: 'EUR',
      }),
    );
    setIsEditing(false);
  }, [budget, projectId, dispatch]);

  if (!financeConfig || !stats) {
    return <div>{t('common.loading', { defaultValue: 'A carregar...' })}</div>;
  }

  const currentBudget = parseFloat(financeConfig.budget) || 0;
  const totalExpenses = stats.totalExpenses || 0;
  const balance = currentBudget - totalExpenses;
  const percentageUsed =
    currentBudget > 0 ? ((totalExpenses / currentBudget) * 100).toFixed(1) : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className={styles.wrapper}>
      {/* Budget Configuration */}
      <div className={styles.budgetSection}>
        <h3>{t('finance.budgetConfig', { defaultValue: 'Configuração de Orçamento' })}</h3>
        {isEditing ? (
          <Form className={styles.budgetForm}>
            <Form.Field>
              <label>{t('finance.budget', { defaultValue: 'Orçamento' })}</label>
              <Input
                type="number"
                step="0.01"
                value={budget}
                onChange={handleBudgetChange}
                placeholder="0.00"
              />
            </Form.Field>
            <Button primary onClick={handleBudgetSave}>
              {t('common.save', { defaultValue: 'Guardar' })}
            </Button>
            <Button onClick={() => setIsEditing(false)}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </Button>
          </Form>
        ) : (
          <div className={styles.budgetDisplay}>
            <span className={styles.budgetValue}>{formatCurrency(currentBudget)}</span>
            <Button size="small" onClick={() => setIsEditing(true)}>
              {t('common.edit', { defaultValue: 'Editar' })}
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>
            {t('finance.budget', { defaultValue: 'Orçamento' })}
          </div>
          <div className={styles.cardValue}>{formatCurrency(currentBudget)}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>
            {t('finance.totalExpenses', { defaultValue: 'Despesas Totais' })}
          </div>
          <div className={styles.cardValue}>{formatCurrency(totalExpenses)}</div>
        </div>

        <div className={`${styles.summaryCard} ${balance < 0 ? styles.negative : ''}`}>
          <div className={styles.cardLabel}>
            {t('finance.balance', { defaultValue: 'Saldo' })}
          </div>
          <div className={styles.cardValue}>{formatCurrency(balance)}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>
            {t('finance.percentageUsed', { defaultValue: '% Utilizado' })}
          </div>
          <div className={styles.cardValue}>{percentageUsed}%</div>
        </div>
      </div>

      {/* By Category */}
      {stats.byCategory && stats.byCategory.length > 0 && (
        <div className={styles.statsSection}>
          <h3>{t('finance.byCategory', { defaultValue: 'Por Categoria' })}</h3>
          <div className={styles.statsList}>
            {stats.byCategory.map((item) => (
              <div key={item.category} className={styles.statsItem}>
                <span className={styles.statsLabel}>{item.category}</span>
                <span className={styles.statsValue}>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Month */}
      {stats.byMonth && stats.byMonth.length > 0 && (
        <div className={styles.statsSection}>
          <h3>{t('finance.byMonth', { defaultValue: 'Por Mês' })}</h3>
          <div className={styles.statsList}>
            {stats.byMonth.map((item) => (
              <div key={item.month} className={styles.statsItem}>
                <span className={styles.statsLabel}>{item.month}</span>
                <span className={styles.statsValue}>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

OverviewTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default OverviewTab;

