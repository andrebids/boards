/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';

import { HomeViews } from '../../../../constants/Enums';
import { HomeViewIcons } from '../../../../constants/Icons';

import styles from './SelectOrderStep.module.scss';

const SelectViewStep = React.memo(({ value, onSelect, onClose }) => {
  const [t] = useTranslation();

  const handleSelectClick = useCallback(
    (_, { value: nextValue }) => {
      if (nextValue !== value) {
        onSelect(nextValue);
      }

      onClose();
    },
    [value, onSelect, onClose]
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
          {[HomeViews.GRID_PROJECTS, HomeViews.GROUPED_PROJECTS].map(view => (
            <Menu.Item
              key={view}
              value={view}
              active={view === value}
              className={styles.menuItem}
              onClick={handleSelectClick}
            >
              <Icon
                name={HomeViewIcons[view]}
                className={styles.menuItemIcon}
              />
              {t(`common.${view}`)}
            </Menu.Item>
          ))}
        </Menu>
      </Popup.Content>
    </>
  );
});

SelectViewStep.propTypes = {
  value: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SelectViewStep;
