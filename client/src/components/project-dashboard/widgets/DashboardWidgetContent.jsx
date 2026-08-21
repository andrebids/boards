import React from 'react';
import PropTypes from 'prop-types';

import DashboardGanttWidget from './DashboardGanttWidget';
import DashboardBlachereProductsWidget from './DashboardBlachereProductsWidget';
import DashboardCodexUsageWidget from './DashboardCodexUsageWidget';

import styles from './DashboardWidgetContent.module.scss';

const DashboardWidgetContent = React.memo(({ widget }) => {
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
  widget: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    config: PropTypes.shape({
      projectId: PropTypes.string,
      zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']),
    }),
  }).isRequired,
};

export default DashboardWidgetContent;
