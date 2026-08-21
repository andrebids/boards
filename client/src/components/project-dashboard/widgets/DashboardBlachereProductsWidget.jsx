import React from 'react';
import PropTypes from 'prop-types';

import styles from './DashboardBlachereProductsWidget.module.scss';

const TASK_GROUP_LABELS = [
  {
    label: 'Static',
    tasks: [
      'Cherry Light',
      'LED',
      'Pix',
      'Teto de Luz',
      'Fil Lumière',
      'RGB',
      'TSL',
      'Nostalgia',
      '2 Tone TSL',
      'GP + Estalactite',
      'GP + LEDs',
      'Decors Effects',
    ],
  },
  {
    label: 'Animated',
    tasks: [
      'Cherry',
      'Flash',
      'Slow Flash PW',
      'Slow Flash WW',
      'Slow Glow / Água a correr',
      'Flash',
      'Slow PW',
      'Slow WW',
      'Custom Videos',
      '10 Fixed Videos',
      'Flash',
      'Slow WW',
      'Slow F PW',
      'Cometa',
      '2 Tone Animation',
      'PRJ',
    ],
  },
];

const TASK_GROUPS = TASK_GROUP_LABELS.map((group) => ({
  ...group,
  tasks: group.tasks.map((title, index) => ({
    id: `${group.label}-${title}-${index}`,
    title,
  })),
}));

const TICKER_LABELS = {
  done: 'Concluído',
  pending: 'Por fazer',
};

const stopGridInteraction = (event) => event.stopPropagation();

const TaskTicker = React.memo(({ isEditable, label, onToggle, status }) => {
  const className = `${styles.ticker} ${styles[status]} ${isEditable ? styles.editableTicker : ''}`;
  const content = status === 'done' && <span aria-hidden="true">✓</span>;
  const labelText = `${label}: ${TICKER_LABELS[status]}${isEditable ? '. Alterar estado' : ''}`;

  if (!isEditable) {
    return (
      <span aria-label={labelText} className={className}>
        {content}
      </span>
    );
  }

  return (
    <button
      aria-label={labelText}
      className={className}
      type="button"
      onClick={onToggle}
      onMouseDown={stopGridInteraction}
      onPointerDown={stopGridInteraction}
      onTouchStart={stopGridInteraction}
    >
      {content}
    </button>
  );
});

TaskTicker.propTypes = {
  isEditable: PropTypes.bool.isRequired,
  label: PropTypes.oneOf(['2D', '3D']).isRequired,
  onToggle: PropTypes.func,
  status: PropTypes.oneOf(['done', 'pending']).isRequired,
};

TaskTicker.defaultProps = {
  onToggle: undefined,
};

const getTaskStatus = (taskStates, taskId, column) =>
  taskStates?.[taskId]?.[column] === 'done' ? 'done' : 'pending';

const DashboardBlachereProductsWidget = React.memo(
  ({ group, isEditable, onToggleTask, taskStates }) => {
    const groups = group
      ? TASK_GROUPS.filter((taskGroup) => taskGroup.label.toLowerCase() === group)
      : TASK_GROUPS;
    const title = group ? `Products - ${groups[0].label}` : 'Blachere Products';
    const titleId = `blachere-${group || 'products'}-title`;

    return (
      <section className={styles.wrapper} aria-labelledby={titleId}>
        <header className={styles.header}>
          <strong id={titleId}>{title}</strong>
          <span className={styles.trackerChip}>2D</span>
          <span className={styles.trackerChip}>3D</span>
        </header>
        <ul className={styles.list}>
          {groups.flatMap((taskGroup) => [
            ...(groups.length > 1
              ? [
                  <li className={styles.groupTitle} key={taskGroup.label}>
                    {taskGroup.label}
                  </li>,
                ]
              : []),
            ...taskGroup.tasks.map((task) => (
              <li key={task.id}>
                <span className={styles.taskName}>{task.title}</span>
                <TaskTicker
                  isEditable={isEditable}
                  label="2D"
                  status={getTaskStatus(taskStates, task.id, 'twoD')}
                  onToggle={() => onToggleTask(task.id, 'twoD')}
                />
                <TaskTicker
                  isEditable={isEditable}
                  label="3D"
                  status={getTaskStatus(taskStates, task.id, 'threeD')}
                  onToggle={() => onToggleTask(task.id, 'threeD')}
                />
              </li>
            )),
          ])}
        </ul>
      </section>
    );
  },
);

DashboardBlachereProductsWidget.propTypes = {
  group: PropTypes.oneOf(['animated', 'static']),
  isEditable: PropTypes.bool,
  onToggleTask: PropTypes.func,
  taskStates: PropTypes.objectOf(
    PropTypes.shape({
      twoD: PropTypes.oneOf(['done', 'pending']),
      threeD: PropTypes.oneOf(['done', 'pending']),
    }),
  ),
};

DashboardBlachereProductsWidget.defaultProps = {
  group: undefined,
  isEditable: false,
  onToggleTask: () => {},
  taskStates: undefined,
};

export default DashboardBlachereProductsWidget;
