/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

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
  const financeConfig = useSelector(selectors.selectFinanceConfig);
  const isLoading = useSelector(selectors.selectFinanceIsLoading);

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

