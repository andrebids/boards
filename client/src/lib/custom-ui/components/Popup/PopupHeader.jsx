/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Popup as SemanticUIPopup } from 'semantic-ui-react';

import Button from '../Button';

import styles from './PopupHeader.module.css';

const PopupHeader = React.memo(({ children, onBack }) => {
  const [t] = useTranslation();

  return (
    <SemanticUIPopup.Header
      className={onBack ? `${styles.wrapper} ${styles.withBack}` : styles.wrapper}
    >
      {onBack && (
        <Button
          aria-label={t('action.back')}
          className={styles.backButton}
          icon="angle left"
          isIconOnly
          variant="ghost"
          onClick={onBack}
        />
      )}
      <div className={styles.content}>{children}</div>
    </SemanticUIPopup.Header>
  );
});

PopupHeader.propTypes = {
  children: PropTypes.node.isRequired,
  onBack: PropTypes.func,
};

PopupHeader.defaultProps = {
  onBack: undefined,
};

export default PopupHeader;
