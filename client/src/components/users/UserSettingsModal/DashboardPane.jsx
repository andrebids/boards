/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Tab } from 'semantic-ui-react';

import { Button } from '../../../lib/custom-ui';
import Paths from '../../../constants/Paths';

import styles from './DashboardPane.module.scss';

const DashboardPane = React.memo(({ onNavigate }) => (
  <Tab.Pane attached={false} className={styles.wrapper}>
    <section className={styles.section}>
      <h3 className={styles.title}>Dashboard TV</h3>
      <p className={styles.description}>
        Configure os widgets e a disposição do único dashboard partilhado, ou abra a versão limpa
        para mostrar num ecrã.
      </p>
      <div className={styles.actions}>
        <Button as={Link} to={Paths.DASHBOARD} variant="primary" onClick={onNavigate}>
          Editar dashboard
        </Button>
        <Button as={Link} to={`${Paths.DASHBOARD}?tv=1`} variant="secondary" onClick={onNavigate}>
          Abrir visualizador TV
        </Button>
      </div>
    </section>
  </Tab.Pane>
));

DashboardPane.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

export default DashboardPane;
