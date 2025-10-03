/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Input } from 'semantic-ui-react';
import { useClosableModal } from '../../../../hooks';

import { LABEL_COLORS } from './label-colors';

import styles from './DefaultLabelForm.module.scss';
import globalStyles from '../../../../styles.module.scss';

// Helper para converter 'berry-red' -> classe CSS modular
const toBackgroundClassName = (colorValue) => {
  const camelCase = colorValue
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
  const classKey = `background${camelCase.charAt(0).toUpperCase()}${camelCase.slice(1)}`;
  return globalStyles[classKey] || classKey;
};

const DefaultLabelForm = React.memo(({ isOpen, label, existingLabels, onClose, onCreate, onUpdate }) => {
  const [t] = useTranslation();
  const [data, setData] = useState({
    name: '',
    color: 'berry-red',
  });
  const [errors, setErrors] = useState({});

  // Inicializar com dados do label a editar
  useEffect(() => {
    if (label) {
      setData({
        name: label.name || '',
        color: label.color || 'berry-red',
      });
    } else {
      setData({
        name: '',
        color: 'berry-red',
      });
    }
    setErrors({});
  }, [label, isOpen]);

  const handleFieldChange = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!data.name || data.name.trim().length === 0) {
      newErrors.name = t('common.nameMustBeProvided', 'O nome é obrigatório');
    } else if (data.name.trim().length > 60) {
      newErrors.name = t('common.nameTooLong', 'O nome é muito longo (máximo 60 caracteres)');
    } else {
      // Verificar nome único (case-insensitive)
      const isDuplicate = existingLabels.some(
        (l) =>
          l.id !== label?.id &&
          l.name.toLowerCase().trim() === data.name.toLowerCase().trim()
      );
      if (isDuplicate) {
        newErrors.name = t('common.nameAlreadyExists', 'Já existe uma etiqueta com este nome');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data, label, existingLabels, t]);

  const handleSubmit = useCallback(() => {
    if (!validate()) {
      return;
    }

    const trimmedData = {
      name: data.name.trim(),
      color: data.color,
    };

    if (label) {
      onUpdate(label.id, trimmedData);
    } else {
      onCreate(trimmedData);
    }

    onClose();
  }, [data, label, validate, onCreate, onUpdate, onClose]);

  const previewClass = toBackgroundClassName(data.color);

  const [ClosableModal] = useClosableModal();

  return (
    <ClosableModal open={isOpen} onClose={onClose} size="tiny" className="glass label-form-modal">
      <ClosableModal.Header className={styles.header}>
        {label
          ? t('common.editDefaultLabel', 'Editar Etiqueta Padrão')
          : t('common.addDefaultLabel', 'Criar Rótulo Pré-definido')}
      </ClosableModal.Header>
      
      <ClosableModal.Content className={styles.content}>
        {/* Nome */}
        <div className={styles.field}>
          <label className={styles.label}>{t('common.name', 'Nome')}</label>
          <Input
            fluid
            value={data.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder={t('common.namePlaceholder', 'Ex: Urgente')}
            autoFocus
            maxLength={60}
            className={styles.input}
          />
          {errors.name && <div className={styles.error}>{errors.name}</div>}
        </div>

        {/* Preview da Cor */}
        <div className={styles.field}>
          <label className={styles.label}>{t('common.color', 'Cor')}</label>
          <div className={`${styles.colorPreviewBox} ${previewClass}`}>
            {data.color.toUpperCase().replace(/-/g, ' ')}
          </div>
        </div>

        {/* Grid de Cores */}
        <div className={styles.colorGrid}>
          {LABEL_COLORS.map((color) => {
            const colorClass = toBackgroundClassName(color.value);
            const isSelected = data.color === color.value;
            return (
              <button
                key={color.value}
                type="button"
                className={`${styles.colorButton} ${colorClass} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleFieldChange('color', color.value)}
                title={color.label}
              />
            );
          })}
        </div>
      </ClosableModal.Content>

      <ClosableModal.Actions className={styles.actions}>
        <Button onClick={onClose} className={styles.cancelButton}>
          {t('action.cancel', 'Cancelar')}
        </Button>
        <Button primary onClick={handleSubmit} className={styles.submitButton}>
          {label ? t('action.save', 'Guardar') : t('action.add', 'Criar')}
        </Button>
      </ClosableModal.Actions>
    </ClosableModal>
  );
});

DefaultLabelForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  label: PropTypes.object,
  existingLabels: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};

DefaultLabelForm.defaultProps = {
  label: null,
};

export default DefaultLabelForm;
