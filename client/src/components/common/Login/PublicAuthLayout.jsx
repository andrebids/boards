/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Grid, Header } from 'semantic-ui-react';

import styles from './Content.module.scss';

const PublicAuthLayout = React.memo(({ children, title }) => (
  <main className={classNames(styles.wrapper, styles.fullHeight)}>
    <Grid verticalAlign="middle" className={classNames(styles.grid, styles.fullHeight)}>
      <Grid.Column computer={6} tablet={16} mobile={16}>
        <div className={styles.loginWrapper}>
          <Header as="h1" textAlign="center" className={styles.formTitle}>
            Blachere Boards
          </Header>
          <Header as="h2" textAlign="center" className={styles.formSubtitle}>
            {title}
          </Header>
          <div className={styles.formWrapper}>{children}</div>
        </div>
      </Grid.Column>
      <Grid.Column
        computer={10}
        only="computer"
        className={classNames(styles.cover, styles.fullHeight)}
        aria-hidden="true"
      >
        <div className={styles.coverOverlay} />
      </Grid.Column>
    </Grid>
  </main>
));

PublicAuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
};

export default PublicAuthLayout;
