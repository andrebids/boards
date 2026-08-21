import React from 'react';
import PropTypes from 'prop-types';

import styles from './DashboardBlachereProductsWidget.module.scss';

const TASKS = [
  { id: 'range', title: 'Definir gama de artigos 2026', twoD: 'done', threeD: 'pending' },
  { id: 'models', title: 'Validar modelos de produto', twoD: 'done', threeD: 'done' },
  {
    id: 'displays',
    title: 'Preparar maquetes para expositores',
    twoD: 'pending',
    threeD: 'pending',
  },
  { id: 'specs', title: 'Rever fichas técnicas', twoD: 'done', threeD: 'pending' },
  { id: 'finishes', title: 'Confirmar acabamentos e materiais', twoD: 'pending', threeD: 'done' },
];

const TICKER_LABELS = {
  done: 'Concluído',
  pending: 'Por fazer',
};

const TaskTicker = React.memo(({ label, status }) => (
  <span
    className={`${styles.ticker} ${styles[status]}`}
    aria-label={`${label}: ${TICKER_LABELS[status]}`}
  >
    {status === 'done' && <span aria-hidden="true">✓</span>}
  </span>
));

TaskTicker.propTypes = {
  label: PropTypes.oneOf(['2D', '3D']).isRequired,
  status: PropTypes.oneOf(['done', 'pending']).isRequired,
};

const DashboardBlachereProductsWidget = React.memo(() => (
  <section className={styles.wrapper} aria-labelledby="blachere-products-title">
    <header className={styles.header}>
      <strong id="blachere-products-title">Blachere Products</strong>
      <span className={styles.trackerChip}>2D</span>
      <span className={styles.trackerChip}>3D</span>
    </header>
    <ul className={styles.list}>
      {TASKS.map((task) => (
        <li key={task.id}>
          <span className={styles.taskName}>{task.title}</span>
          <TaskTicker label="2D" status={task.twoD} />
          <TaskTicker label="3D" status={task.threeD} />
        </li>
      ))}
    </ul>
  </section>
));

export default DashboardBlachereProductsWidget;
