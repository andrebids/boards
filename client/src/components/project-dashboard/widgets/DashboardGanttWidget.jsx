import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon, Loader } from 'semantic-ui-react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import { ProjectGanttProvider, useGantt } from '../../gantt';
import GanttTimelineAdapter from '../../gantt/GanttTimelineAdapter';
import { selectTimelineData } from '../../gantt/ganttSelectors';
import DashboardTaskListPanel from './DashboardTaskListPanel';
import useDashboardTaskList from './useDashboardTaskList';

import styles from './DashboardGanttWidget.module.scss';

const DashboardGanttContent = React.memo(
  ({ cardId, projectName, rotationSeconds, taskListId, zoomLevel }) => {
    const { plan, items, links, isLoading, error } = useGantt();
    const [activeView, setActiveView] = useState('gantt');
    const taskListState = useDashboardTaskList(cardId, taskListId);
    const { timelineItems, timelineLinks } = useMemo(
      () => selectTimelineData(items, links),
      [items, links],
    );

    useEffect(() => {
      setActiveView('gantt');

      if (!cardId || !taskListId || !rotationSeconds) {
        return undefined;
      }

      const intervalId = window.setInterval(() => {
        setActiveView((previous) => (previous === 'gantt' ? 'taskList' : 'gantt'));
      }, rotationSeconds * 1000);

      return () => window.clearInterval(intervalId);
    }, [cardId, rotationSeconds, taskListId]);

    return (
      <section className={styles.wrapper} aria-label={`Gantt: ${projectName}`}>
        <header
          className={`${styles.header} ${activeView !== 'gantt' ? styles.viewHidden : ''}`}
          aria-hidden={activeView !== 'gantt'}
        >
          <div>
            <span>Gantt</span>
            <strong>{projectName}</strong>
          </div>
          {!isLoading && plan?.isEnabled && <small>{timelineItems.length} tarefas planeadas</small>}
        </header>
        <div
          className={`${styles.content} ${activeView !== 'gantt' ? styles.viewHidden : ''}`}
          aria-hidden={activeView !== 'gantt'}
        >
          {isLoading && <Loader active inverted size="small" />}
          {!isLoading && error && (
            <div className={styles.state} role="alert">
              <Icon name="warning circle" />
              Não foi possível carregar o Gantt.
            </div>
          )}
          {!isLoading && !error && !plan?.isEnabled && (
            <div className={styles.state}>
              <Icon name="calendar outline" />O Gantt deste projeto não está ativo.
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
        <div
          className={`${styles.taskListView} ${activeView !== 'taskList' ? styles.viewHidden : ''}`}
          aria-hidden={activeView !== 'taskList'}
        >
          <DashboardTaskListPanel
            error={taskListState.error}
            isLoading={taskListState.isLoading}
            taskList={taskListState.taskList}
            tasks={taskListState.tasks}
          />
        </div>
      </section>
    );
  },
);

DashboardGanttContent.propTypes = {
  cardId: PropTypes.string,
  projectName: PropTypes.string.isRequired,
  rotationSeconds: PropTypes.number,
  taskListId: PropTypes.string,
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
};

DashboardGanttContent.defaultProps = {
  cardId: undefined,
  rotationSeconds: undefined,
  taskListId: undefined,
};

const DashboardGanttWidget = React.memo(
  ({ cardId, projectId, rotationSeconds, taskListId, zoomLevel }) => {
    const project = useSelector((state) => selectors.selectProjectById(state, projectId));

    return (
      <ProjectGanttProvider projectId={projectId}>
        <DashboardGanttContent
          cardId={cardId}
          projectName={project?.name || 'Projeto'}
          rotationSeconds={rotationSeconds}
          taskListId={taskListId}
          zoomLevel={zoomLevel}
        />
      </ProjectGanttProvider>
    );
  },
);

DashboardGanttWidget.propTypes = {
  cardId: PropTypes.string,
  projectId: PropTypes.string.isRequired,
  rotationSeconds: PropTypes.number,
  taskListId: PropTypes.string,
  zoomLevel: PropTypes.oneOf(['day', 'week', 'month', 'quarter']).isRequired,
};

DashboardGanttWidget.defaultProps = {
  cardId: undefined,
  rotationSeconds: undefined,
  taskListId: undefined,
};

export default DashboardGanttWidget;
