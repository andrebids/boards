/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Icon, Form, Input, TextArea, Dropdown } from 'semantic-ui-react';

import selectors from '../../../selectors';
import actions from '../../../actions';
import { EXPENSE_CATEGORIES } from '../../../constants/ExpenseCategories';

import styles from './ExpensesTab.module.scss';
import FilterBar from './filters/FilterBar';
import FilterDrawer from './filters/FilterDrawer';

const ExpensesTab = React.memo(({ projectId }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const allExpenses = useSelector(selectors.selectExpenses);
  const [editingExpense, setEditingExpense] = useState(null);
  const formContainerRef = useRef(null);
  // Inline editing state for table rows
  const [inlineEditingRowId, setInlineEditingRowId] = useState(null);
  const [inlineEditingData, setInlineEditingData] = useState({
    date: '',
    category: '',
    description: '',
    value: '',
  });
  // Debug/stacking helpers
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);
  const inlineDropdownRefs = useRef({});

  // Helper: log stacking context info for an element and its ancestors
  const logStackingContext = useCallback((el, label = 'el') => {
    try {
      if (!el) {
        console.log('[Finance][stacking] no element for', label);
        return;
      }
      const lines = [];
      let node = el;
      let depth = 0;
      while (node && depth < 12) {
        const cs = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        lines.push({
          depth,
          tag: node.tagName?.toLowerCase(),
          classes: node.className,
          id: node.id,
          position: cs.position,
          zIndex: cs.zIndex,
          transform: cs.transform,
          filter: cs.filter,
          backdropFilter: cs.backdropFilter,
          opacity: cs.opacity,
          mixBlendMode: cs.mixBlendMode,
          isolation: cs.isolation,
          overflow: `${cs.overflow}/${cs.overflowX}/${cs.overflowY}`,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        });
        node = node.parentElement;
        depth += 1;
      }
      console.table(lines);
    } catch (e) {
      console.log('[Finance][stacking] error', e);
    }
  }, []);
  
  // Estados para o formulário inline
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0]; // YYYY-MM-DD para input date
    return {
      category: '',
      description: '',
      value: '',
      date: isoDate, // Pré-define a data atual no formato ISO
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
      date: formData.date, // Já está no formato ISO (YYYY-MM-DD)
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
    const isoDate = today.toISOString().split('T')[0];
    setFormData({
      category: '',
      description: '',
      value: '',
      date: isoDate, // Pré-define a data atual no formato ISO
    });
    setEditingExpense(null);
  }, [formData, editingExpense, projectId, dispatch]);

  const handleClearForm = useCallback(() => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    setFormData({
      category: '',
      description: '',
      value: '',
      date: isoDate, // Pré-define a data atual no formato ISO
    });
    setEditingExpense(null);
  }, []);

  const handleEditExpense = useCallback((expense) => {
    console.log('[Finance] Edit expense click', expense);
    setEditingExpense(expense);
    // Converter data do formato ISO para o formato do input date
    let dateValue = '';
    if (expense.date) {
      const date = new Date(expense.date);
      if (!isNaN(date.getTime())) {
        dateValue = date.toISOString().split('T')[0];
      }
    }
    setFormData({
      category: expense.category || '',
      description: expense.description || '',
      value: expense.value?.toString() || '',
      date: dateValue,
    });

    // Trazer o formulário para a vista para deixar claro que está em modo de edição
    if (formContainerRef.current) {
      try {
        formContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        // fallback silencioso
      }
    }
  }, []);

  const handleDeleteExpense = useCallback(
    (expenseId) => {
      if (window.confirm(t('finance.confirmDelete', { defaultValue: 'Tem a certeza?' }))) {
        dispatch(actions.deleteExpense(expenseId));
      }
    },
    [dispatch, t],
  );

  // Inline edit handlers
  const handleInlineEditStart = useCallback((expense) => {
    console.log('[Finance] Inline edit start', expense);
    setInlineEditingRowId(expense.id);
    let dateValue = '';
    if (expense.date) {
      const d = new Date(expense.date);
      if (!isNaN(d.getTime())) {
        dateValue = d.toISOString().split('T')[0];
      }
    }
    setInlineEditingData({
      date: dateValue,
      category: expense.category || '',
      description: expense.description || '',
      value:
        typeof expense.value === 'number'
          ? expense.value.toString()
          : (expense.value || '').toString(),
    });
  }, []);

  const handleInlineChange = useCallback((field, value) => {
    setInlineEditingData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleInlineApprove = useCallback((expense) => {
    const nextValue = parseFloat(inlineEditingData.value);
    if (Number.isNaN(nextValue)) {
      alert(t('finance.valueInvalid', { defaultValue: 'Valor inválido' }));
      return;
    }
    const payload = {
      date: inlineEditingData.date,
      category: inlineEditingData.category,
      description: inlineEditingData.description || '-',
      value: nextValue,
    };
    console.log('[Finance] Inline approve', { id: expense.id, ...payload });
    dispatch(actions.updateExpense(expense.id, payload));
    setInlineEditingRowId(null);
    setInlineEditingData({ date: '', category: '', description: '', value: '' });
  }, [dispatch, inlineEditingData, t]);

  // Dropdown open/close handlers for inline row dropdowns
  const handleInlineDropdownOpen = useCallback((expenseId) => {
    setActiveDropdownRowId(expenseId);
    // Log stacking info for the dropdown menu and relevant ancestors
    requestAnimationFrame(() => {
      const root = inlineDropdownRefs.current[expenseId];
      // Verificar se root existe e é um elemento DOM válido
      if (root && root.querySelector && typeof root.querySelector === 'function') {
        const menu = root.querySelector('.menu');
        console.log('[Finance] Dropdown opened on row', expenseId);
        logStackingContext(menu, 'dropdown.menu');
        // Also log row, header and glass container for context
        const row = root.closest(`.${styles.tableRow}`);
        const header = document.querySelector(`.${styles.tableHeader}`);
        const glass = document.querySelector(`.${styles.glassContainer}`);
        logStackingContext(row, 'tableRow');
        logStackingContext(header, 'tableHeader');
        logStackingContext(glass, 'glassContainer');
      }
    });
  }, [logStackingContext, styles.tableRow, styles.tableHeader, styles.glassContainer]);

  const handleInlineDropdownClose = useCallback(() => {
    setActiveDropdownRowId(null);
    console.log('[Finance] Dropdown closed');
  }, []);

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

  const sortOptions = [
    { key: 'recente', value: 'data-recente', text: t('finance.newestDate', { defaultValue: 'Mais recente' }) },
    { key: 'antiga', value: 'data-antiga', text: t('finance.oldestDate', { defaultValue: 'Mais antiga' }) },
    { key: 'alto', value: 'valor-alto', text: t('finance.highestValue', { defaultValue: 'Maior valor' }) },
    { key: 'baixo', value: 'valor-baixo', text: t('finance.lowestValue', { defaultValue: 'Menor valor' }) },
  ];

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
          <div className={styles.formContainer} ref={formContainerRef}>
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
                  type="date"
                  value={formData.date}
                  className={styles.field}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  style={{ 
                    colorScheme: 'dark'
                  }}
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
        {/* Nova Barra de Filtros (com Drawer) */}
        {(() => {
          const filters = {
            startDate,
            endDate,
            month: selectedMonth,
            year: selectedYear,
            categoryId: category || 'all',
            sort: sortBy,
          };
          const resultsText = (startDate || endDate || category || selectedMonth || selectedYear)
            ? `${expenses.length} / ${allExpenses?.length || 0}`
            : '';
          const handleRemoveChip = (key) => {
            switch (key) {
              case 'range':
                setStartDate('');
                setEndDate('');
                break;
              case 'monthYear':
                setSelectedMonth('');
                setSelectedYear('');
                break;
              case 'category':
                setCategory('');
                break;
              default:
                break;
            }
          };
          const handleChangeFromDrawer = (next) => {
            setStartDate(next.startDate || '');
            setEndDate(next.endDate || '');
            setSelectedMonth(next.month || '');
            setSelectedYear(next.year || '');
            setCategory(next.categoryId === 'all' ? '' : (next.categoryId || ''));
            setSortBy(next.sort || 'data-recente');
          };

          return (
            <>
              <FilterBar
                filters={filters}
                resultsText={resultsText}
                onOpen={handleToggleFilters}
                onClear={handleClearFilters}
                onRemoveChip={handleRemoveChip}
              />
              <FilterDrawer
                open={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                value={filters}
                onChange={handleChangeFromDrawer}
                onApply={handleChangeFromDrawer}
                categoryOptions={EXPENSE_CATEGORIES}
                sortOptions={sortOptions}
              />
            </>
          );
        })()}

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
              <div className={`${styles.headerCell} ${styles.valueHeader}`}>{t('finance.value', { defaultValue: 'Valor' })}</div>
              <div className={`${styles.headerCell} ${styles.actionsHeader}`}>
                {t('common.actions', { defaultValue: 'Ações' })}
              </div>
            </div>

            {/* Table Body */}
            <div className={styles.tableBody}>
              {expenses.map((expense) => (
                <div key={expense.id}>
                  {/* Desktop Table Row */}
                  <div className={`${styles.tableRow} ${activeDropdownRowId === expense.id ? styles.rowRaised : ''}`}>
                    <div className={styles.tableCell}>
                      {inlineEditingRowId === expense.id ? (
                        <Input
                          type="date"
                          value={inlineEditingData.date}
                          onChange={(e) => handleInlineChange('date', e.target.value)}
                          className={styles.inlineInput}
                          style={{ colorScheme: 'dark' }}
                        />
                      ) : (
                        <>{formatDate(expense.date)}</>
                      )}
                    </div>
                    <div className={styles.tableCell}>
                      {inlineEditingRowId === expense.id ? (
                        <Dropdown
                          selection
                          search
                          options={EXPENSE_CATEGORIES}
                          value={inlineEditingData.category}
                          onChange={(_, { value }) => handleInlineChange('category', value)}
                          allowAdditions
                          additionLabel={t('finance.addCategory', { defaultValue: 'Adicionar: ' })}
                          onAddItem={(_, { value }) => handleInlineChange('category', value)}
                          className={styles.inlineDropdown}
                          onOpen={() => handleInlineDropdownOpen(expense.id)}
                          onClose={handleInlineDropdownClose}
                          ref={(el) => { inlineDropdownRefs.current[expense.id] = el; }}
                        />
                      ) : (
                        <>{expense.category}</>
                      )}
                    </div>
                    <div className={`${styles.tableCell} ${styles.descriptionCell}`}>
                      {inlineEditingRowId === expense.id ? (
                        <Input
                          type="text"
                          value={inlineEditingData.description}
                          onChange={(e) => handleInlineChange('description', e.target.value)}
                          className={styles.inlineInput}
                        />
                      ) : (
                        <>{expense.description}</>
                      )}
                    </div>
                    <div className={`${styles.tableCell} ${styles.valueCell}`}>
                      {inlineEditingRowId === expense.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={inlineEditingData.value}
                          onChange={(e) => handleInlineChange('value', e.target.value)}
                          className={styles.inlineInput}
                        />
                      ) : (
                        <>{formatCurrency(expense.value)}</>
                      )}
                    </div>
                    <div className={`${styles.tableCell} ${styles.actionsCell}`}>
                      <div className={styles.actionButtons}>
                        {inlineEditingRowId === expense.id ? (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleInlineApprove(expense)}
                            type="button"
                            aria-label={t('common.approve', { defaultValue: 'Aprovar' })}
                            title={t('common.approve', { defaultValue: 'Aprovar' })}
                          >
                            <Icon name="check" />
                          </button>
                        ) : (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleInlineEditStart(expense)}
                            type="button"
                            aria-label={t('common.edit', { defaultValue: 'Editar' })}
                            title={t('common.edit', { defaultValue: 'Editar' })}
                          >
                            <Icon name="edit outline" />
                          </button>
                        )}
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteExpense(expense.id)}
                          type="button"
                          aria-label={t('common.delete', { defaultValue: 'Eliminar' })}
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
                          type="button"
                          aria-label={t('common.edit', { defaultValue: 'Editar' })}
                          title={t('common.edit', { defaultValue: 'Editar' })}
                        >
                          <Icon name="edit outline" />
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteExpense(expense.id)}
                          type="button"
                          aria-label={t('common.delete', { defaultValue: 'Eliminar' })}
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

