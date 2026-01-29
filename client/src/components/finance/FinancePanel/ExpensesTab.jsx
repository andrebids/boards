/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon, Input, Dropdown, Modal, Button } from 'semantic-ui-react';

import selectors from '../../../selectors';
import api from '../../../api';
import actions from '../../../actions';
import { EXPENSE_CATEGORIES } from '../../../constants/ExpenseCategories';

import styles from './ExpensesTab.module.scss';
import FilterBar from './filters/FilterBar';
import FilterDrawer from './filters/FilterDrawer';
import { formatCurrency, formatDate } from './utils/format';
import { buildYearOptions, buildSortOptions } from './utils/options';
import ExpenseForm from './ExpensesTab/Form/ExpenseForm';

const ExpensesTab = React.memo(({ projectId }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();

  const allExpenses = useSelector(selectors.selectExpenses);
  const attachmentsByExpense = useSelector((state) => state.finance.expenseAttachmentsByExpenseId);
  const uploadingByExpense = useSelector((state) => state.finance.uploadingAttachmentByExpenseId || {});
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

  // Converter URLs absolutas em caminhos relativos (para passar pelo proxy e enviar cookies)
  const toRelativeUrl = useCallback((url) => {
    try {
      if (typeof url === 'string' && (url.indexOf('http://') === 0 || url.indexOf('https://') === 0)) {
        var parsed = new URL(url);
        return parsed.pathname + (parsed.search || '');
      }
      return url;
    } catch (e) {
      return url;
    }
  }, []);

  // Modal de confirmação para apagar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState(null);

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
  
  // Form gerido pelo componente filho ExpenseForm
  
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

  // Handlers do formulário agora residem em ExpenseForm

  const handleEditExpense = useCallback((expense) => {
    console.log('[Finance] Edit expense click', expense);
    setEditingExpense(expense);

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
      setExpenseIdToDelete(expenseId);
      setIsDeleteModalOpen(true);
    },
    [],
  );

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteModalOpen(false);
    setExpenseIdToDelete(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (expenseIdToDelete) {
      dispatch(actions.deleteExpense(expenseIdToDelete));
    }
    setIsDeleteModalOpen(false);
    setExpenseIdToDelete(null);
  }, [dispatch, expenseIdToDelete]);

  const handleOpenAttachments = useCallback((expense) => {
    // lazy fetch if not loaded
    if (!attachmentsByExpense[expense.id]) {
      console.log('[Finance][attachments] lazy-fetch before upload for expense', expense.id);
      dispatch(actions.fetchExpenseAttachments(expense.id));
    }
    // open a simple file input prompt for now
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        console.log('[Finance][attachments] user cancelled file selection');
        return;
      }
      console.log('[Finance][attachments] file selected', { expenseId: expense.id, name: file.name, type: file.type, size: file.size });
      dispatch(actions.createExpenseAttachment(expense.id, file, file.name));
    };
    input.click();
  }, [dispatch, attachmentsByExpense]);

  const handleDownloadAttachment = useCallback((attachment) => {
    const filename = (attachment && attachment.data && attachment.data.filename) || attachment.name;
    const absolute = attachment && attachment.data && attachment.data.url;
    var url = absolute;
    if (!url) {
      var builder = api && api.finance && api.finance.getExpenseAttachmentDownloadUrl;
      if (builder) {
        url = builder(attachment.id, filename);
      } else {
        url = '/expense-attachments/' + attachment.id + '/download/' + encodeURIComponent(filename);
      }
    }
    var finalUrl = toRelativeUrl(url);
    console.log('[Finance][attachments] open download', { url: finalUrl, id: attachment && attachment.id, filename: filename });
    window.open(finalUrl, '_blank');
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId) => {
    if (window.confirm(t('finance.confirmDeleteAttachment', { defaultValue: 'Remover anexo?' }))) {
      dispatch(actions.deleteExpenseAttachment(attachmentId));
    }
  }, [dispatch, t]);

  // Abrir anexo (imagem/PDF) numa nova aba
  const openAttachment = useCallback((attachment) => {
    var url = attachment && attachment.data && attachment.data.url;
    if (!url) {
      var filename = (attachment && attachment.data && attachment.data.filename) || attachment.name;
      url = '/expense-attachments/' + attachment.id + '/download/' + encodeURIComponent(filename);
    }
    var finalUrl = toRelativeUrl(url);
    console.log('[Finance][attachments] open view', { url: finalUrl, id: attachment && attachment.id });
    window.open(finalUrl, '_blank');
  }, [toRelativeUrl]);

  // Prefetch de anexos para as despesas visíveis para renderizar thumbnails
  useEffect(() => {
    if (!allExpenses || !Array.isArray(allExpenses)) return;
    const maxPrefetch = 50;
    allExpenses.slice(0, maxPrefetch).forEach((exp) => {
      if (attachmentsByExpense[exp.id] === undefined) {
        dispatch(actions.fetchExpenseAttachments(exp.id));
      }
    });
  }, [allExpenses, attachmentsByExpense, dispatch]);

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

  // Opções para seletores
  const yearOptions = React.useMemo(() => buildYearOptions(), []);

  const sortOptions = React.useMemo(() => buildSortOptions(t), [t]);

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

  // Validação do formulário movida para ExpenseForm

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
          <ExpenseForm
            t={t}
            categories={EXPENSE_CATEGORIES}
            editingExpense={editingExpense}
            onSetEditingExpense={setEditingExpense}
            projectId={projectId}
            dispatch={dispatch}
            formContainerRef={formContainerRef}
          />
        </div>

        {/* Right column - Table */}
        <div className={styles.tableColumn}>
          {/* Main glass container */}
      <div className={styles.glassContainer}>
        {/* Nova Barra de Filtros (com Sidebar que empurra a tabela) */}
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
            <React.Fragment>
              <FilterBar
                filters={filters}
                resultsText={resultsText}
                onOpen={handleToggleFilters}
                onClear={handleClearFilters}
                onRemoveChip={handleRemoveChip}
              />

              {/* Drawer overlay variant */}
              {isFiltersOpen && (
                <FilterDrawer
                  open={true}
                  onClose={() => setIsFiltersOpen(false)}
                  value={filters}
                  onChange={handleChangeFromDrawer}
                  onApply={handleChangeFromDrawer}
                  categoryOptions={EXPENSE_CATEGORIES}
                  sortOptions={sortOptions}
                />
              )}

              {/* Conteúdo da Tabela */}
              <div>
                  {/* Expenses table */}
                  {expenses.length === 0 ? (
                    <div className={styles.empty}>
                      {t('finance.noExpenses', { defaultValue: 'Sem despesas registadas.' })}
                    </div>
                  ) : (
                    <div className={styles.tableSection}>
                      {/* Table Header */}
                      <div className={styles.tableHeader}>
                        <div className={styles.headerCell} />
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
                              <div className={`${styles.tableCell} ${styles.thumbCell}`}>
                                {(() => {
                                  const list = attachmentsByExpense[expense.id];
                                  const isUploading = !!uploadingByExpense[expense.id];
                                  if (isUploading && (!list || list.length === 0)) {
                                    return (
                                      <div className={styles.uploadingLabel} title={t('finance.uploading', { defaultValue: 'A enviar…' })}>
                                        <Icon name="spinner" loading /> {t('finance.uploading', { defaultValue: 'A enviar…' })}
                                      </div>
                                    );
                                  }
                                  if (list && list.length > 0) {
                                    const att = list[0];
                                    const hasImage = !!(att.data && att.data.image && att.data.image.thumbnailsExtension);
                                    if (hasImage) {
                                      var thumbUrl = (att && att.data && att.data.thumbnailUrls && att.data.thumbnailUrls.outside360);
                                      thumbUrl = toRelativeUrl(thumbUrl);
                                      if (!thumbUrl) {
                                        thumbUrl = '/expense-attachments/' + att.id + '/download/thumbnails/outside-360.' + att.data.image.thumbnailsExtension;
                                      }
                                      return (
                                        <img
                                          className={styles.attachmentThumb}
                                          src={thumbUrl}
                                          alt={att.name}
                                          onClick={function () { openAttachment(att); }}
                                        />
                                      );
                                    }
                                    return (
                                      <button
                                        type="button"
                                        className={styles.actionButton}
                                        onClick={() => openAttachment(att)}
                                        title={att.name}
                                        aria-label={att.name}
                                      >
                                        <Icon name="file pdf outline" />
                                      </button>
                                    );
                                  }
                                  return (
                                    <span
                                      className={styles.noAttachmentLabel}
                                      onClick={() => handleOpenAttachments(expense)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleOpenAttachments(expense);
                                        }
                                      }}
                                      title={t('finance.addAttachment', { defaultValue: 'Anexar ficheiro' })}
                                    >
                                      {t('finance.noAttachment', { defaultValue: 'Sem anexo' })}
                                    </span>
                                  );
                                })()}
                              </div>
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
                                  {false && (
                                    <button
                                      className={styles.actionButton}
                                      onClick={() => handleOpenAttachments(expense)}
                                      type="button"
                                      aria-label={t('finance.addAttachment', { defaultValue: 'Anexos' })}
                                      title={t('finance.addAttachment', { defaultValue: 'Anexos' })}
                                    >
                                      <Icon name="paperclip" />
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

                            {/* Attachments row desativado para evitar botão extra */}
                            {false && attachmentsByExpense[expense.id] && attachmentsByExpense[expense.id].length > 0 && (
                              <div className={styles.attachmentsRow}>
                                <div className={styles.attachmentsCell}>
                                  {attachmentsByExpense[expense.id].map((att) => (
                                    <div key={att.id} className={styles.attachmentItem}>
                                      <button
                                        className={styles.attachmentButton}
                                        onClick={() => handleDownloadAttachment(att)}
                                        type="button"
                                        title={att.name}
                                        aria-label={att.name}
                                      >
                                        <Icon name={att.data?.image ? 'file image outline' : 'file pdf outline'} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
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
            </React.Fragment>
          );
        })()}
      </div>
        </div>
      </div>
    {/* Modal de confirmação para apagar despesa */}
    <Modal open={isDeleteModalOpen} onClose={handleDeleteCancel} size="small">
      <Modal.Header>
        {t('finance.confirmDeleteTitle', { defaultValue: 'Eliminar despesa' })}
      </Modal.Header>
      <Modal.Content>
        <p>{t('finance.confirmDelete', { defaultValue: 'Tem a certeza que quer eliminar esta despesa?' })}</p>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={handleDeleteCancel}>
          {t('action.cancel', 'Cancelar')}
        </Button>
        <Button negative onClick={handleDeleteConfirm}>
          <Icon name="trash" />
          {t('action.delete', 'Eliminar')}
        </Button>
      </Modal.Actions>
    </Modal>
    </div>
  );
});

// Modal de confirmação global (fora do memo export)

ExpensesTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default ExpensesTab;

