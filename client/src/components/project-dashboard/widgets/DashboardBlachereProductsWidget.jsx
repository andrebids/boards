import React from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2 } from 'lucide-react';

import styles from './DashboardBlachereProductsWidget.module.scss';

export const DEFAULT_TASKS = [
  {
    id: 'range',
    title: 'Definir gama de artigos 2026',
    twoD: 'done',
    threeD: 'pending',
  },
  {
    id: 'models',
    title: 'Validar modelos de produto',
    twoD: 'done',
    threeD: 'done',
  },
  {
    id: 'displays',
    title: 'Preparar maquetes para expositores',
    twoD: 'pending',
    threeD: 'pending',
  },
  {
    id: 'specs',
    title: 'Rever fichas técnicas',
    twoD: 'done',
    threeD: 'pending',
  },
  {
    id: 'finishes',
    title: 'Confirmar acabamentos e materiais',
    twoD: 'pending',
    threeD: 'done',
  },
];

const TICKER_LABELS = {
  done: 'Concluído',
  pending: 'Por fazer',
};

const stopGridDrag = (event) => event.stopPropagation();

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

const DashboardBlachereProductsWidget = React.memo(({ isEditing, onTasksChange, tasks }) => {
  const handleAddTask = () => {
    onTasksChange([
      ...tasks,
      {
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: 'Novo elemento',
        twoD: 'pending',
        threeD: 'pending',
      },
    ]);
  };

  const handleRemoveTask = (taskId) => {
    onTasksChange(tasks.filter((task) => task.id !== taskId));
  };

  const handleTitleChange = (taskId, title) => {
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onTasksChange(tasks.map((task) => (task.id === taskId ? { ...task, title: nextTitle } : task)));
  };

  return (
    <section className={styles.wrapper} aria-labelledby="blachere-products-title">
      <header className={styles.header}>
        <strong id="blachere-products-title">Blachere Products</strong>
        <span className={styles.trackerChip}>2D</span>
        <span className={styles.trackerChip}>3D</span>
      </header>
      {isEditing && (
        <div className={styles.editorControls}>
          <button
            className={styles.addTask}
            type="button"
            onClick={handleAddTask}
            onMouseDown={stopGridDrag}
            onPointerDown={stopGridDrag}
            onTouchStart={stopGridDrag}
          >
            <Plus aria-hidden="true" size={15} strokeWidth={2.5} />
            Adicionar elemento
          </button>
        </div>
      )}
      {tasks.length > 0 ? (
        <ul className={`${styles.list} ${isEditing ? styles.editingList : ''}`}>
          {tasks.map((task) => (
            <li key={task.id}>
              {isEditing ? (
                <input
                  aria-label={`Nome do elemento: ${task.title}`}
                  className={styles.taskInput}
                  defaultValue={task.title}
                  maxLength={160}
                  onBlur={(event) => handleTitleChange(task.id, event.target.value)}
                  onMouseDown={stopGridDrag}
                  onPointerDown={stopGridDrag}
                  onTouchStart={stopGridDrag}
                />
              ) : (
                <span className={styles.taskName}>{task.title}</span>
              )}
              <TaskTicker label="2D" status={task.twoD} />
              <TaskTicker label="3D" status={task.threeD} />
              {isEditing && (
                <button
                  aria-label={`Remover elemento ${task.title}`}
                  className={styles.removeTask}
                  title="Remover elemento"
                  type="button"
                  onClick={() => handleRemoveTask(task.id)}
                  onMouseDown={stopGridDrag}
                  onPointerDown={stopGridDrag}
                  onTouchStart={stopGridDrag}
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>Sem elementos na lista.</p>
      )}
    </section>
  );
});

DashboardBlachereProductsWidget.propTypes = {
  isEditing: PropTypes.bool,
  onTasksChange: PropTypes.func,
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      twoD: PropTypes.oneOf(['done', 'pending']).isRequired,
      threeD: PropTypes.oneOf(['done', 'pending']).isRequired,
    }),
  ),
};

DashboardBlachereProductsWidget.defaultProps = {
  isEditing: false,
  onTasksChange: () => {},
  tasks: DEFAULT_TASKS,
};

export default DashboardBlachereProductsWidget;
