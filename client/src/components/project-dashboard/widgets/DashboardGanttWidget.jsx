import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Icon, Loader } from 'semantic-ui-react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import { ProjectGanttProvider, useGantt } from '../../gantt';
import GanttTimelineAdapter from '../../gantt/GanttTimelineAdapter';
import { selectTimelineData } from '../../gantt/ganttSelectors';

import styles from './DashboardGanttWidget.module.scss';

const DashboardGanttContent = React.memo(({ projectName, zoomLevel }) => {
  const { plan, items, links, isLoading, error } = useGantt();
  const { timelineItems, timelineLinks } = useMemo(
    () => selectTimelineData(items, links),
    [items, links],
  );

  return (
    <section className={styles.wrapper} aria-label={`Gantt: ${projectName}`}>
      <header className={styles.header}>
        <div>
          <span>Gantt</span>
          <strong>{projectName}</strong>
        </div>
        {!isLoading && plan?.isEnabled && <small>{timelineItems.length} tarefas planeadas</small>}
      </header>
      <div className={styles.content}>
        {isLoading && <Loader active inverted size="small" />}
        {!isLoading && error && (
          <div className={styles.state} role="alert">
            <Icon name="warning circle" />
            Não foi possível carregar o Gantt.
          </div>
        )}
        {!isLoading && !error && !plan?.isEnabled && (
          <div className={styles.state}>
            <Icon name="calendar outline" />
            O Gantt deste projeto não está ativo.
          </div>
        )}
        {!isLoading && !error && plan?.isEnabled && timelineItems.length === 0 && (
          <div className={styles.state}>
            <Icon name="calendar check outline" />
            Não há tarefas calendarizadas.
          </div>
        )}
        {!isLoading && !error && plan?.isEnabled && timelineItems.length > 0 && (
          <GanttTimelineAdapter
            items={timelineItems}
            links={timelineLinks}
            zoomLevel={zoomLevel}
            readonly
            variant="dashboard"
          />
        )}
      </div>
    </section>
  );
});

DashboardGanttContent.propTypes = {
  projectName: PropTypes.string.isRequired,
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
};

const DashboardGanttWidget = React.memo(({ projectId, zoomLevel }) => {
  const project = useSelector((state) => selectors.selectProjectById(state, projectId));

  return (
    <ProjectGanttProvider projectId={projectId}>
      <DashboardGanttContent projectName={project?.name || 'Projeto'} zoomLevel={zoomLevel} />
    </ProjectGanttProvider>
  );
});

DashboardGanttWidget.propTypes = {
  projectId: PropTypes.string.isRequired,
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
};

export default DashboardGanttWidget;
