/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Form, Input, TextArea, Dropdown } from 'semantic-ui-react';

import selectors from '../../../selectors';
import actions from '../../../actions';
import { EXPENSE_CATEGORIES } from '../../../constants/ExpenseCategories';

import styles from './ExpensesTab.module.scss';

const ExpensesTab = React.memo(({ projectId }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const allExpenses = useSelector(selectors.selectExpenses);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Estados para o formulário inline
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return {
      category: '',
      description: '',
      value: '',
      date: formattedDate, // Pré-define a data atual no formato dd/mm/yyyy
    };
  });
  
  // Estados para filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('data-recente');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  // Novos estados para o redesign
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Handlers para o formulário inline
  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFormSubmit = useCallback(() => {
    const data = {
      category: formData.category,
      description: formData.description || '-',
      value: parseFloat(formData.value),
      date: formData.date,
      status: 'pending',
    };

    console.log('Submitting expense:', data);
    console.log('Project ID:', projectId);

    if (editingExpense) {
      dispatch(actions.updateExpense(editingExpense.id, data));
    } else {
      dispatch(actions.createExpense(projectId, data));
    }

    // Limpar formulário após submissão
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    setFormData({
      category: '',
      description: '',
      value: '',
      date: formattedDate, // Pré-define a data atual no formato dd/mm/yyyy
    });
    setEditingExpense(null);
  }, [formData, editingExpense, projectId, dispatch]);

  const handleClearForm = useCallback(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    setFormData({
      category: '',
      description: '',
      value: '',
      date: formattedDate, // Pré-define a data atual no formato dd/mm/yyyy
    });
    setEditingExpense(null);
  }, []);

  const handleEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category || '',
      description: expense.description || '',
      value: expense.value?.toString() || '',
      date: expense.date || '',
    });
  }, []);

  const handleDeleteExpense = useCallback(
    (expenseId) => {
      if (window.confirm(t('finance.confirmDelete', { defaultValue: 'Tem a certeza?' }))) {
        dispatch(actions.deleteExpense(expenseId));
      }
    },
    [dispatch, t],
  );

  // Handlers para filtros
  const handleClearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setSortBy('data-recente');
    setSelectedMonth('');
    setSelectedYear('');
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setEndDate(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
  }, []);

  const handleSortByChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
    if (e.target.value && selectedYear) {
      const year = parseInt(selectedYear);
      const month = parseInt(e.target.value);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  }, [selectedYear]);

  const handleYearChange = useCallback((e) => {
    setSelectedYear(e.target.value);
    if (e.target.value && selectedMonth) {
      const year = parseInt(e.target.value);
      const month = parseInt(selectedMonth);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  }, [selectedMonth]);

  // Filtros rápidos
  const handleFilterThisMonth = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setSelectedMonth('');
    setSelectedYear('');
  }, []);

  const handleFilterThisYear = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setSelectedMonth('');
    setSelectedYear('');
  }, []);

  const handleFilterCustom = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSelectedYear('');
  }, []);

  // Novos handlers para o redesign
  const handleToggleFilters = useCallback(() => {
    setIsFiltersOpen(prev => !prev);
  }, []);

  // Calcular filtros ativos
  useEffect(() => {
    let count = 0;
    if (startDate || endDate) count++;
    if (category) count++;
    if (selectedMonth || selectedYear) count++;
    setActiveFiltersCount(count);
  }, [startDate, endDate, category, selectedMonth, selectedYear]);

  // Filtrar e ordenar despesas
  const expenses = React.useMemo(() => {
    if (!allExpenses || !Array.isArray(allExpenses)) {
      return [];
    }

    let filtered = allExpenses;

    // Filtro por data
    if (startDate || endDate) {
      filtered = filtered.filter((expense) => {
        if (!expense.date) return false;

        const expenseDate = new Date(expense.date);

        if (startDate) {
          const start = new Date(startDate);
          if (expenseDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (expenseDate > end) return false;
        }

        return true;
      });
    }

    // Filtro por categoria
    if (category) {
      filtered = filtered.filter((expense) => 
        expense.category && expense.category === category
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'valor-alto':
          return (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0);
        case 'valor-baixo':
          return (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0);
        case 'data-recente':
          return new Date(b.date) - new Date(a.date);
        case 'data-antiga':
          return new Date(a.date) - new Date(b.date);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allExpenses, startDate, endDate, category, sortBy]);

  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('pt-PT');
  }, []);

  // Opções para seletores
  const monthOptions = [
    { value: '1', text: 'Janeiro' },
    { value: '2', text: 'Fevereiro' },
    { value: '3', text: 'Março' },
    { value: '4', text: 'Abril' },
    { value: '5', text: 'Maio' },
    { value: '6', text: 'Junho' },
    { value: '7', text: 'Julho' },
    { value: '8', text: 'Agosto' },
    { value: '9', text: 'Setembro' },
    { value: '10', text: 'Outubro' },
    { value: '11', text: 'Novembro' },
    { value: '12', text: 'Dezembro' },
  ];

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push({ value: i.toString(), text: i.toString() });
    }
    return years;
  }, []);

  const calculateTotal = useCallback(() => {
    if (!expenses || !Array.isArray(expenses)) {
      return 0;
    }
    
    return expenses.reduce((total, expense) => {
      if (!expense || typeof expense.value === 'undefined') {
        return total;
      }
      const value = parseFloat(expense.value) || 0;
      return total + value;
    }, 0);
  }, [expenses]);

  // Validação do formulário
  const isFormValid = formData.category && formData.value && formData.date;

  return (
    <div className={styles.wrapper}>
      {/* Header with title */}
      <div className={styles.header}>
        <h3>{t('finance.expenses', { defaultValue: 'Despesas' })}</h3>
      </div>

      {/* Main content with two columns */}
      <div className={styles.mainContent}>
        {/* Left column - Form */}
        <div className={styles.formColumn}>
          <div className={styles.formContainer}>
            <h4 className={styles.formTitle}>
              {editingExpense 
                ? t('finance.editExpense', { defaultValue: 'Editar Despesa' })
                : t('finance.addExpense', { defaultValue: 'Adicionar Despesa' })
              }
            </h4>
            
            <Form>
              <Form.Field required>
                <label className="glass-label">{t('finance.date', { defaultValue: 'Data' })}</label>
                <Input
                  type="text"
                  value={formData.date}
                  placeholder="dd/mm/yyyy"
                  className={styles.field}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                />
              </Form.Field>

              <Form.Field required>
                <label className="glass-label">{t('finance.category', { defaultValue: 'Categoria' })}</label>
                <Dropdown
                  placeholder={t('finance.selectCategory', {
                    defaultValue: 'Selecionar categoria',
                  })}
                  fluid
                  selection
                  search
                  options={EXPENSE_CATEGORIES}
                  value={formData.category}
                  className={styles.field}
                  onChange={(_, { value }) => handleFormChange('category', value)}
                  allowAdditions
                  additionLabel={t('finance.addCategory', { defaultValue: 'Adicionar: ' })}
                  onAddItem={(_, { value }) => handleFormChange('category', value)}
                />
              </Form.Field>

              <Form.Field>
                <label className="glass-label">{t('finance.description', { defaultValue: 'Descrição' })}</label>
                <TextArea
                  rows={3}
                  value={formData.description}
                  className={styles.field}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder={t('finance.descriptionPlaceholder', {
                    defaultValue: 'Descrição da despesa...',
                  })}
                />
              </Form.Field>

              <Form.Field required>
                <label className="glass-label">{t('finance.value', { defaultValue: 'Valor (EUR)' })}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  className={styles.field}
                  onChange={(e) => handleFormChange('value', e.target.value)}
                  placeholder="0.00"
                />
              </Form.Field>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button onClick={handleClearForm}>
                  {t('common.cancel', { defaultValue: 'Limpar' })}
                </Button>
                <Button primary onClick={handleFormSubmit} disabled={!isFormValid}>
                  {t('common.save', { defaultValue: 'Guardar' })}
                </Button>
              </div>
            </Form>
          </div>
        </div>

        {/* Right column - Table */}
        <div className={styles.tableColumn}>
          {/* Main glass container */}
      <div className={styles.glassContainer}>
        {/* Nova Barra de Filtros Redesenhada */}
        <div className={styles.filtersBarContainer}>
          {/* Barra Principal */}
          <div className={styles.filtersBarMain}>
            <div className={styles.filtersBarLeft}>
              <button 
                className={styles.filtersToggleButton}
                onClick={handleToggleFilters}
              >
                <Icon name="filter" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className={styles.filterCount}>{activeFiltersCount}</span>
                )}
                <Icon name={isFiltersOpen ? "chevron up" : "chevron down"} />
              </button>
              
              <div className={styles.quickSortWrapper}>
                <Icon name="sort" />
                <select className={styles.inlineSort} value={sortBy} onChange={handleSortByChange}>
                  <option value="data-recente">{t('finance.newestDate', { defaultValue: 'Mais recente' })}</option>
                  <option value="data-antiga">{t('finance.oldestDate', { defaultValue: 'Mais antiga' })}</option>
                  <option value="valor-alto">{t('finance.highestValue', { defaultValue: 'Maior valor' })}</option>
                  <option value="valor-baixo">{t('finance.lowestValue', { defaultValue: 'Menor valor' })}</option>
                </select>
              </div>
            </div>
            
            <div className={styles.filtersBarRight}>
              {(startDate || endDate || category) && (
                <div className={styles.resultsBadge}>
                  {expenses.length} / {allExpenses?.length || 0}
                </div>
              )}
              
              {activeFiltersCount > 0 && (
                <button className={styles.clearButton} onClick={handleClearFilters}>
                  <Icon name="redo" />
                  Limpar
                </button>
              )}
            </div>
          </div>
          
          {/* Dropdown de Filtros Avançados */}
          {isFiltersOpen && (
            <div className={styles.filtersDropdown}>
              <div className={styles.filtersGrid}>
                {/* Período - Filtros Rápidos */}
                <div className={styles.filterSection}>
                  <label className={styles.filterSectionLabel}>
                    <Icon name="calendar" /> Período Rápido
                  </label>
                  <div className={styles.quickFiltersGrid}>
                    <button className={styles.quickFilterBtn} onClick={handleFilterThisMonth}>
                      Este Mês
                    </button>
                    <button className={styles.quickFilterBtn} onClick={handleFilterThisYear}>
                      Este Ano
                    </button>
                    <button className={styles.quickFilterBtn} onClick={handleFilterCustom}>
                      Personalizado
                    </button>
                  </div>
                </div>
                
                {/* Intervalo de Datas */}
                <div className={styles.filterSection}>
                  <label className={styles.filterSectionLabel}>
                    <Icon name="calendar outline" /> Intervalo de Datas
                  </label>
                  <div className={styles.dateRangeInputs}>
                    <input type="date" className={styles.dateInput} value={startDate} onChange={handleStartDateChange} />
                    <span className={styles.dateSeparator}>até</span>
                    <input type="date" className={styles.dateInput} value={endDate} onChange={handleEndDateChange} />
                  </div>
                </div>
                
                {/* Mês e Ano */}
                <div className={styles.filterSection}>
                  <label className={styles.filterSectionLabel}>
                    <Icon name="calendar check" /> Mês/Ano Específico
                  </label>
                  <div className={styles.monthYearInputs}>
                    <select className={styles.filterSelect} value={selectedMonth} onChange={handleMonthChange}>
                      <option value="">Mês</option>
                      {monthOptions.map(m => <option key={m.value} value={m.value}>{m.text}</option>)}
                    </select>
                    <select className={styles.filterSelect} value={selectedYear} onChange={handleYearChange}>
                      <option value="">Ano</option>
                      {yearOptions.map(y => <option key={y.value} value={y.value}>{y.text}</option>)}
                    </select>
                  </div>
                </div>
                
                {/* Categoria */}
                <div className={styles.filterSection}>
                  <label className={styles.filterSectionLabel}>
                    <Icon name="tag" /> Categoria
                  </label>
                  <select className={styles.filterSelect} value={category} onChange={handleCategoryChange}>
                    <option value="">Todas</option>
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat.key} value={cat.value}>{cat.text}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expenses table */}
        {expenses.length === 0 ? (
          <div className={styles.empty}>
            {t('finance.noExpenses', { defaultValue: 'Sem despesas registadas.' })}
          </div>
        ) : (
          <div className={styles.tableSection}>
            {/* Table Header */}
            <div className={styles.tableHeader}>
              <div className={styles.headerCell}>{t('finance.date', { defaultValue: 'Data' })}</div>
              <div className={styles.headerCell}>{t('finance.category', { defaultValue: 'Categoria' })}</div>
              <div className={`${styles.headerCell} ${styles.descriptionHeader}`}>{t('finance.description', { defaultValue: 'Descrição' })}</div>
              <div className={styles.headerCell}>{t('finance.value', { defaultValue: 'Valor' })}</div>
              <div className={`${styles.headerCell} ${styles.actionsHeader}`}>
                {t('common.actions', { defaultValue: 'Ações' })}
              </div>
            </div>

            {/* Table Body */}
            <div className={styles.tableBody}>
              {expenses.map((expense) => (
                <div key={expense.id}>
                  {/* Desktop Table Row */}
                  <div className={styles.tableRow}>
                    <div className={styles.tableCell}>
                      {formatDate(expense.date)}
                    </div>
                    <div className={styles.tableCell}>
                      {expense.category}
                    </div>
                    <div className={`${styles.tableCell} ${styles.descriptionCell}`}>
                      {expense.description}
                    </div>
                    <div className={`${styles.tableCell} ${styles.valueCell}`}>
                      {formatCurrency(expense.value)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.actionsCell}`}>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEditExpense(expense)}
                          title={t('common.edit', { defaultValue: 'Editar' })}
                        >
                          <Icon name="edit outline" />
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteExpense(expense.id)}
                          title={t('common.delete', { defaultValue: 'Eliminar' })}
                        >
                          <Icon name="trash alternate outline" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Card */}
                  <div className={styles.mobileCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardDate}>
                        {formatDate(expense.date)}
                      </div>
                      <div className={styles.cardValue}>
                        {formatCurrency(expense.value)}
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardCategory}>
                        {expense.category}
                      </div>
                      <div className={styles.cardDescription}>
                        {expense.description}
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEditExpense(expense)}
                          title={t('common.edit', { defaultValue: 'Editar' })}
                        >
                          <Icon name="edit outline" />
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteExpense(expense.id)}
                          title={t('common.delete', { defaultValue: 'Eliminar' })}
                        >
                          <Icon name="trash alternate outline" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Row */}
            <div className={styles.totalRow}>
              <div className={styles.totalCell}></div>
              <div className={styles.totalCell}></div>
              <div className={styles.totalCell}>
                <strong>{t('finance.total', { defaultValue: 'Total' })}</strong>
              </div>
              <div className={`${styles.totalCell} ${styles.valueCell}`}>
                <strong>{formatCurrency(calculateTotal())}</strong>
              </div>
              <div className={styles.totalCell}></div>
            </div>
            
            {/* Mobile Total Card */}
            <div className={styles.mobileCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardDate}>
                  <strong>{t('finance.total', { defaultValue: 'Total' })}</strong>
                </div>
                <div className={styles.cardValue}>
                  <strong>{formatCurrency(calculateTotal())}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
});

ExpensesTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default ExpensesTab;

