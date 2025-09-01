/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './NotificationIndicator.module.scss';

/**
 * Componente de notificação azul para o sidebar - apenas uma bola pequena
 */
const NotificationIndicator = React.memo(() => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.badge}>
        <div className={styles.badgeContent}>
          <div className={styles.pulseRing} />
          <div className={styles.glowEffect} />
        </div>
      </div>
    </div>
  );
});

export default NotificationIndicator;
