/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './NotificationIndicator.module.scss';

/**
 * Componente de notificação simplificado - sempre azul claro
 */
const NotificationIndicator = React.memo(({ count = 1 }) => {
  const displayCount = count > 99 ? '99+' : count;

  return (
    <div className={styles.wrapper}>
      <div className={styles.badge}>
        <div className={styles.badgeContent}>
          <span className={styles.count}>{displayCount}</span>
          <div className={styles.pulseRing} />
          <div className={styles.glowEffect} />
        </div>
      </div>
    </div>
  );
});

NotificationIndicator.propTypes = {
  count: PropTypes.number,
};

export default NotificationIndicator;
