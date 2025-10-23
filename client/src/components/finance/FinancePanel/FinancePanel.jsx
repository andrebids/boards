/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Modal, Tab } from 'semantic-ui-react';

import { useClosableModal } from '../../../hooks';
import entryActions from '../../../entry-actions';
import actions from '../../../actions';
import selectors from '../../../selectors';
import OverviewTab from './OverviewTab';
import ExpensesTab from './ExpensesTab';
import MembersTab from './MembersTab';

import styles from './FinancePanel.module.scss';

const FinancePanel = React.memo(() => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const currentProject = useSelector(selectors.selectCurrentProject);
  const currentUser = useSelector(selectors.selectCurrentUser);
  const financeConfig = useSelector(selectors.selectFinanceConfig);
  const isLoading = useSelector(selectors.selectFinanceIsLoading);

  const [ClosableModal] = useClosableModal();

  useEffect(() => {
    if (currentProject) {
      dispatch(actions.fetchFinanceConfig(currentProject.id));
      dispatch(actions.fetchExpenses(currentProject.id, {}));
      dispatch(actions.fetchExpenseStats(currentProject.id));
    }
  }, [currentProject, dispatch]);

  const handleClose = useCallback(() => {
    dispatch(entryActions.closeModal());
  }, [dispatch]);

  const handleTabChange = useCallback((_, { activeIndex }) => {
    setActiveTabIndex(activeIndex);
  }, []);

  if (!currentProject) {
    return null;
  }

  const panes = [
    {
      menuItem: t('finance.overview', { defaultValue: 'Visão Geral' }),
      render: () => <OverviewTab projectId={currentProject.id} />,
    },
    {
      menuItem: t('finance.expenses', { defaultValue: 'Despesas' }),
      render: () => <ExpensesTab projectId={currentProject.id} />,
    },
    {
      menuItem: t('finance.members', { defaultValue: 'Membros' }),
      render: () => <MembersTab projectId={currentProject.id} />,
    },
  ];

  return (
    <ClosableModal
      closeIcon
      size="large"
      centered={false}
      className={styles.financeModal}
      onClose={handleClose}
    >
      <Modal.Header className={styles.header}>
        {t('finance.title', { defaultValue: 'Painel Financeiro' })} - {currentProject.name}
      </Modal.Header>
      <Modal.Content className={styles.content}>
        {isLoading && !financeConfig ? (
          <div className={styles.loading}>
            {t('common.loading', { defaultValue: 'A carregar...' })}
          </div>
        ) : (
          <Tab
            menu={{
              secondary: true,
              pointing: true,
            }}
            panes={panes}
            activeIndex={activeTabIndex}
            onTabChange={handleTabChange}
          />
        )}
      </Modal.Content>
    </ClosableModal>
  );
});

export default FinancePanel;

