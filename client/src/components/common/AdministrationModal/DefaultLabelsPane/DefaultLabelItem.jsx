/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Label } from 'semantic-ui-react';
import { AlertDialog, Button } from '../../../../lib/custom-ui';

import styles from './DefaultLabelItem.module.scss';
import globalStyles from '../../../../styles.module.scss';

// Helper para converter 'berry-red' -> 'backgroundBerryRed' e obter a classe CSS modular
const toBackgroundClassName = (colorValue) => {
  const camelCase = colorValue
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
  const classKey = `background${camelCase.charAt(0).toUpperCase()}${camelCase.slice(1)}`;
  const className = globalStyles[classKey] || classKey;
  return className;
};

const DefaultLabelItem = React.memo(({ label, onEdit, onDelete }) => {
  const [t] = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleEdit = useCallback(() => {
    onEdit(label);
  }, [label, onEdit]);

  const handleDeleteClick = useCallback(() => {
    setIsConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(label.id);
    setIsConfirmOpen(false);
  }, [label.id, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  return (
    <>
      <div className={styles.wrapper}>
      <div className={styles.labelPreview}>
        <Label className={toBackgroundClassName(label.color)} size="large">
          {label.name}
        </Label>
      </div>
      
      <div className={styles.info}>
        <div className={styles.name}>{label.name}</div>
      </div>

      <div className={styles.actions}>
        <Button variant="danger-soft"
          icon
          size="small"
          className={styles.editButton}
          onClick={handleEdit}
          title={t('action.edit', 'Editar')}
        >
          <Icon name="pencil" />
        </Button>
        <Button variant="secondary"
          icon
          size="small"
          className={styles.deleteButton}
          onClick={handleDeleteClick}
          title={t('action.delete', 'Eliminar')}
        >
          <Icon name="trash" />
        </Button>
      </div>
      </div>

      <AlertDialog
        open={isConfirmOpen}
        cancelLabel={t('action.cancel', 'Cancelar')}
        confirmLabel={t('action.delete', 'Eliminar')}
        description={
          <>
            <p>{t('common.areYouSureYouWantToDeleteThisDefaultLabel', { name: label.name })}</p>
            <p>{t('common.deleteDefaultLabelWarning')}</p>
          </>
        }
        title={t('common.deleteDefaultLabel', 'Eliminar Etiqueta Padrão')}
        tone="danger"
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
});

DefaultLabelItem.propTypes = {
  label: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default DefaultLabelItem;
