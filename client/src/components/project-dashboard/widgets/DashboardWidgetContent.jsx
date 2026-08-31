import React from 'react';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';

import DashboardGanttWidget from './DashboardGanttWidget';
import DashboardBlachereProductsWidget from './DashboardBlachereProductsWidget';
import DashboardCodexUsageWidget from './DashboardCodexUsageWidget';
import DashboardFactorialEntranceQrWidget from './DashboardFactorialEntranceQrWidget';

import styles from './DashboardWidgetContent.module.scss';

const DeferredDashboardGanttWidget = React.memo(
  ({ cardId, projectId, rotationSeconds, taskListId, zoomLevel }) => {
    const [ref, isInView] = useInView({ triggerOnce: true });

    return (
      <div ref={ref} className={styles.deferredGantt}>
        {isInView ? (
          <DashboardGanttWidget
            cardId={cardId}
            projectId={projectId}
            rotationSeconds={rotationSeconds}
            taskListId={taskListId}
            zoomLevel={zoomLevel}
          />
        ) : (
          <span className={styles.deferredGanttPlaceholder}>A carregar Gantt…</span>
        )}
      </div>
    );
  },
);

DeferredDashboardGanttWidget.propTypes = {
  cardId: PropTypes.string,
  projectId: PropTypes.string.isRequired,
  rotationSeconds: PropTypes.number,
  taskListId: PropTypes.string,
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
};

DeferredDashboardGanttWidget.defaultProps = {
  cardId: undefined,
  rotationSeconds: undefined,
  taskListId: undefined,
};

const DashboardWidgetContent = React.memo(({ isEditable, onToggleTask, widget }) => {
  if (widget.type === 'gantt') {
    return (
      <DeferredDashboardGanttWidget
        cardId={widget.config.cardId}
        projectId={widget.config.projectId}
        rotationSeconds={widget.config.rotationSeconds}
        taskListId={widget.config.taskListId}
        zoomLevel={widget.config.zoomLevel}
      />
    );
  }

  if (widget.type === 'blachereProducts') {
    return (
      <DashboardBlachereProductsWidget
        isEditable={isEditable}
        taskStates={widget.config?.taskStates}
        onToggleTask={(taskId, column) => onToggleTask(widget.id, taskId, column)}
      />
    );
  }

  if (widget.type === 'blachereStatic' || widget.type === 'blachereAnimated') {
    return (
      <DashboardBlachereProductsWidget
        group={widget.type === 'blachereStatic' ? 'static' : 'animated'}
        isEditable={isEditable}
        taskStates={widget.config?.taskStates}
        onToggleTask={(taskId, column) => onToggleTask(widget.id, taskId, column)}
      />
    );
  }

  if (widget.type === 'codexUsage') {
    return <DashboardCodexUsageWidget />;
  }

  if (widget.type === 'factorialEntrance') {
    return <DashboardFactorialEntranceQrWidget />;
  }

  return (
    <div className={styles.placeholder}>
      <span>{widget.type === 'progress' ? 'Visão geral' : widget.type}</span>
      <strong>{widget.id === 'overview' ? 'Dashboard TV' : 'Exemplo'}</strong>
    </div>
  );
});

DashboardWidgetContent.propTypes = {
  isEditable: PropTypes.bool,
  onToggleTask: PropTypes.func,
  widget: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    config: PropTypes.shape({
      cardId: PropTypes.string,
      projectId: PropTypes.string,
      rotationSeconds: PropTypes.number,
      taskStates: PropTypes.objectOf(
        PropTypes.shape({
          twoD: PropTypes.oneOf(['done', 'pending']),
          threeD: PropTypes.oneOf(['done', 'pending']),
        }),
      ),
      taskListId: PropTypes.string,
      zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']),
    }),
  }).isRequired,
};

DashboardWidgetContent.defaultProps = {
  isEditable: false,
  onToggleTask: () => {},
};

export default DashboardWidgetContent;
