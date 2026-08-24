import React from 'react';
import PropTypes from 'prop-types';

import DashboardGanttWidget from './DashboardGanttWidget';
import DashboardBlachereProductsWidget from './DashboardBlachereProductsWidget';
import DashboardCodexUsageWidget from './DashboardCodexUsageWidget';

import styles from './DashboardWidgetContent.module.scss';

const DashboardWidgetContent = React.memo(({ isEditable, onToggleTask, widget }) => {
  if (widget.type === 'gantt') {
    return (
      <DashboardGanttWidget
        projectId={widget.config.projectId}
        zoomLevel={widget.config.zoomLevel}
      />
    );
  }

  if (widget.type === 'blachereProducts') {
    return <DashboardBlachereProductsWidget />;
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
      projectId: PropTypes.string,
      taskStates: PropTypes.objectOf(
        PropTypes.shape({
          twoD: PropTypes.oneOf(['done', 'pending']),
          threeD: PropTypes.oneOf(['done', 'pending']),
        }),
      ),
      zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']),
    }),
  }).isRequired,
};

DashboardWidgetContent.defaultProps = {
  isEditable: false,
  onToggleTask: () => {},
};

export default DashboardWidgetContent;
