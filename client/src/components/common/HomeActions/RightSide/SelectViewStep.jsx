/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';

import { HomeViews, ProjectOrders } from '../../../../constants/Enums';
import { HomeViewIcons, ProjectOrderIcons } from '../../../../constants/Icons';

import styles from './SelectMenuStep.module.scss';

const VIEWS = [HomeViews.GRID_PROJECTS, HomeViews.GROUPED_PROJECTS];

const ORDERS = [
  ProjectOrders.BY_DEFAULT,
  ProjectOrders.ALPHABETICALLY,
  ProjectOrders.BY_CREATION_TIME,
];

const SelectViewStep = React.memo(
  ({ view, order, onViewSelect, onOrderSelect, onClose }) => {
    const [t] = useTranslation();

    const handleViewClick = useCallback(
      (_, { value }) => {
        if (value !== view) {
          onViewSelect(value);
        }

        onClose();
      },
      [view, onViewSelect, onClose]
    );

    const handleOrderClick = useCallback(
      (_, { value }) => {
        if (value !== order) {
          onOrderSelect(value);
        }

        onClose();
      },
      [order, onOrderSelect, onClose]
    );

    return (
      <>
        <Popup.Header>
          {t('common.selectView', {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Menu secondary vertical className={styles.menu}>
            {VIEWS.map(item => (
              <Menu.Item
                key={item}
                value={item}
                active={item === view}
                className={styles.menuItem}
                onClick={handleViewClick}
              >
                <Icon
                  name={HomeViewIcons[item]}
                  className={styles.menuItemIcon}
                />
                {t(`common.${item}`)}
              </Menu.Item>
            ))}
            <div className={styles.separator} />
            <div className={styles.sectionLabel}>
              {t('common.projectsOrder')}
            </div>
            {ORDERS.map(item => (
              <Menu.Item
                key={item}
                value={item}
                active={item === order}
                className={styles.menuItem}
                onClick={handleOrderClick}
              >
                <Icon
                  name={ProjectOrderIcons[item]}
                  className={styles.menuItemIcon}
                />
                {t(`common.${item}`)}
              </Menu.Item>
            ))}
          </Menu>
        </Popup.Content>
      </>
    );
  }
);

SelectViewStep.propTypes = {
  view: PropTypes.string.isRequired,
  order: PropTypes.string.isRequired,
  onViewSelect: PropTypes.func.isRequired,
  onOrderSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SelectViewStep;
