/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Popup } from '../../../../lib/custom-ui';

import { ProjectsGridStyles } from '../../../../constants/Enums';
import GridStyleIcons from './grid-style-icons';

import styles from './SelectMenuStep.module.scss';

const SelectGridStyleStep = React.memo(({ value, onSelect, onClose }) => {
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
        {t('common.selectGridStyle', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          {[
            ProjectsGridStyles.REGULAR,
            ProjectsGridStyles.SQUARE,
            ProjectsGridStyles.GALLERY,
          ].map(gridStyle => {
            const GridStyleIcon = GridStyleIcons[gridStyle];

            return (
            <Menu.Item
              key={gridStyle}
              value={gridStyle}
              active={gridStyle === value}
              className={styles.menuItem}
              onClick={handleSelectClick}
            >
              <GridStyleIcon className={styles.gridSvgIcon} />
              {t(`common.${gridStyle}Grid`)}
              </Menu.Item>
            );
          })}
        </Menu>
      </Popup.Content>
    </>
  );
});

SelectGridStyleStep.propTypes = {
  value: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SelectGridStyleStep;
