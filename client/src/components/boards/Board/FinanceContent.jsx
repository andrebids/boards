/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab, Icon } from 'semantic-ui-react';

import actions from '../../../actions';
import selectors from '../../../selectors';
import ExpensesTab from '../../finance/FinancePanel/ExpensesTab';
import MembersTab from '../../finance/FinancePanel/MembersTab';

import styles from './FinanceContent.module.scss';

const FinanceContent = React.memo(() => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const currentProject = useSelector(selectors.selectCurrentProject);
  const currentUser = useSelector(selectors.selectCurrentUser);
  const financeConfig = useSelector(selectors.selectFinanceConfig);
  const isLoading = useSelector(selectors.selectFinanceIsLoading);
  const financeError = useSelector(selectors.selectFinanceError);
  const canAccessFinance = useSelector(selectors.selectCanCurrentUserAccessFinance);

  useEffect(() => {
    if (currentProject) {
      dispatch(actions.fetchFinanceConfig(currentProject.id));
      dispatch(actions.fetchExpenses(currentProject.id, {}));
      dispatch(actions.fetchExpenseStats(currentProject.id));
    }
  }, [currentProject, dispatch]);

  const handleTabChange = useCallback((_, { activeIndex }) => {
    setActiveTabIndex(activeIndex);
  }, []);

  if (!currentProject) {
    return null;
  }

  // Verificar se houve erro de permissão (403)
  const hasPermissionError = financeError && (
    financeError.status === 403 || 
    financeError.message?.includes('forbidden') || 
    financeError.message?.includes('finance member')
  );

  // Se não pode acessar e houve erro de permissão, mostrar mensagem de acesso negado
  if (!canAccessFinance && hasPermissionError) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.accessDeniedContainer}>
          <div className={styles.accessDeniedCard}>
            <Icon name="lock" size="huge" className={styles.lockIcon} />
            <h2 className={styles.accessDeniedTitle}>
              {t('finance.accessDenied.title', { defaultValue: 'Acesso Negado' })}
            </h2>
            <p className={styles.accessDeniedMessage}>
              {t('finance.accessDenied.message', { 
                defaultValue: 'Você não tem permissão para acessar as despesas deste projeto.' 
              })}
            </p>
            <div className={styles.accessDeniedInfo}>
              <Icon name="info circle" />
              <span>
                {t('finance.accessDenied.info', { 
                  defaultValue: 'Apenas administradores, gestores de projeto e membros financeiros autorizados podem visualizar estas informações.' 
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const panes = [
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
    <div className={styles.wrapper}>
      <div className={styles.content}>
        {isLoading && !financeConfig ? (
          <div className={styles.loading}>
            {t('common.loading', { defaultValue: 'A carregar...' })}
          </div>
        ) : (
          <Tab
            menu={{
              secondary: true,
              pointing: true,
              className: styles.tabMenu,
            }}
            panes={panes}
            activeIndex={activeTabIndex}
            onTabChange={handleTabChange}
          />
        )}
      </div>
    </div>
  );
});

export default FinanceContent;

