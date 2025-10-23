/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form, Button, Input, TextArea, Dropdown, Header } from 'semantic-ui-react';

import actions from '../../../actions';
import { useClosableModal } from '../../../hooks';
import { EXPENSE_CATEGORIES } from '../../../constants/ExpenseCategories';
import styles from './AddExpenseModal.module.scss';


const AddExpenseModal = React.memo(({ projectId, expense, onClose }) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [ClosableModal] = useClosableModal();

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    value: '',
    date: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category || '',
        description: expense.description || '',
        value: expense.value?.toString() || '',
        date: expense.date || '',
      });
    } else {
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, date: today }));
    }
  }, [expense]);

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const data = {
      category: formData.category,
      description: formData.description || '-', // Garantir que description não está vazia
      value: parseFloat(formData.value),
      date: formData.date,
      status: 'pending', // Always set as pending by default
    };

    console.log('Submitting expense:', data);
    console.log('Project ID:', projectId);

    if (expense) {
      dispatch(actions.updateExpense(expense.id, data));
    } else {
      dispatch(actions.createExpense(projectId, data));
    }

    onClose();
  }, [formData, expense, projectId, dispatch, onClose]);

  const isValid =
    formData.category &&
    formData.value &&
    formData.date;

  return (
    <ClosableModal basic closeIcon size="small" onClose={onClose}>
      <ClosableModal.Content>
        <Header inverted size="huge">
          {expense
            ? t('finance.editExpense', { defaultValue: 'Editar Despesa' })
            : t('finance.addExpense', { defaultValue: 'Adicionar Despesa' })}
        </Header>
        <Form>
          <Form.Field required>
            <label className="glass-label">{t('finance.date', { defaultValue: 'Data' })}</label>
            <Input
              type="date"
              value={formData.date}
              className={styles.field}
              onChange={(e) => handleChange('date', e.target.value)}
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
              onChange={(_, { value }) => handleChange('category', value)}
              allowAdditions
              additionLabel={t('finance.addCategory', { defaultValue: 'Adicionar: ' })}
              onAddItem={(_, { value }) => handleChange('category', value)}
            />
          </Form.Field>

          <Form.Field>
            <label className="glass-label">{t('finance.description', { defaultValue: 'Descrição' })}</label>
            <TextArea
              rows={3}
              value={formData.description}
              className={styles.field}
              onChange={(e) => handleChange('description', e.target.value)}
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
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="0.00"
            />
          </Form.Field>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button onClick={onClose}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </Button>
            <Button primary onClick={handleSubmit} disabled={!isValid}>
              {t('common.save', { defaultValue: 'Guardar' })}
            </Button>
          </div>
        </Form>
      </ClosableModal.Content>
    </ClosableModal>
  );
});

AddExpenseModal.propTypes = {
  projectId: PropTypes.string.isRequired,
  expense: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default AddExpenseModal;

