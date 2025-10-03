/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Header, Icon } from 'semantic-ui-react';

import DefaultLabelItem from './DefaultLabelItem';
import DefaultLabelForm from './DefaultLabelForm';
import actions from '../../../../actions';

import styles from './DefaultLabelsPane.module.scss';

const DefaultLabelsPane = () => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  
  const labelsById = useSelector(state => 
    state.orm?.OrganizationDefaultLabel?.itemsById || {}
  );
  
  const labels = useMemo(() => {
    const labelIds = Object.keys(labelsById);
    const labelsArray = labelIds.map(id => labelsById[id]);
    return labelsArray.sort((a, b) => (a?.position || 0) - (b?.position || 0));
  }, [labelsById]);

  useEffect(() => {
    dispatch(actions.fetchOrganizationDefaultLabels());
  }, [dispatch]);

  const handleOpenCreateForm = useCallback(() => {
    setEditingLabel(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEditForm = useCallback((label) => {
    setEditingLabel(label);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingLabel(null);
  }, []);

  const handleCreate = useCallback((data) => {
    dispatch(actions.createOrganizationDefaultLabel(data));
  }, [dispatch]);

  const handleUpdate = useCallback((id, data) => {
    dispatch(actions.updateOrganizationDefaultLabel(id, data));
  }, [dispatch]);

  const handleDelete = useCallback((id) => {
    dispatch(actions.deleteOrganizationDefaultLabel(id));
  }, [dispatch]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <Header as="h3">
            {t('common.defaultLabels', 'Etiquetas Padrão')}
          </Header>
          <p className={styles.description}>
            {t('common.defaultLabelsDescription', 'Estas etiquetas são automaticamente adicionadas a todos os novos boards.')}
          </p>
        </div>
        <Button
          primary
          icon
          labelPosition="left"
          onClick={handleOpenCreateForm}
          className={styles.addButton}
        >
          <Icon name="plus" />
          {t('action.addLabel', 'Adicionar Etiqueta')}
        </Button>
      </div>

      <div className={styles.labelsList}>
        {labels.length > 0 ? (
          labels.map((label) => (
            <DefaultLabelItem
              key={label.id}
              label={label}
              onEdit={handleOpenEditForm}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <Icon name="tags" size="huge" className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>
              {t('common.noDefaultLabelsYet', 'Ainda não tem etiquetas padrão.')}
            </p>
            <p className={styles.emptyDescription}>
              {t('common.addCommonLabelsForAllProjects', 'Adicione etiquetas comuns que deseja usar em todos os projetos.')}
            </p>
          </div>
        )}
      </div>

      <DefaultLabelForm
        isOpen={isFormOpen}
        label={editingLabel}
        existingLabels={labels}
        onClose={handleCloseForm}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default DefaultLabelsPane;

