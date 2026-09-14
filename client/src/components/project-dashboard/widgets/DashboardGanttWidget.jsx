import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon, Loader } from 'semantic-ui-react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import { ProjectGanttProvider, useGantt } from '../../gantt';
import GanttTimelineAdapter from '../../gantt/GanttTimelineAdapter';
import {
  filterDashboardGanttLinks,
  getDashboardGanttPageSize,
  paginateDashboardGanttItems,
} from '../../gantt/ganttDashboardLayout';
import { selectTimelineData } from '../../gantt/ganttSelectors';
import DashboardTaskListPanel from './DashboardTaskListPanel';
import useDashboardTaskList from './useDashboardTaskList';

import styles from './DashboardGanttWidget.module.scss';

const DEFAULT_SLOT_SECONDS = 20;
const FALLBACK_CONTENT_HEIGHT = 600;

const DashboardGanttContent = React.memo(
  ({ cardId, projectName, rotationSeconds, taskListId, zoomLevel }) => {
    const { plan, items, links, isLoading, error } = useGantt();
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [slotIndex, setSlotIndex] = useState(0);
    const taskListState = useDashboardTaskList(cardId, taskListId);
    const { timelineItems, timelineLinks } = useMemo(
      () => selectTimelineData(items, links),
      [items, links],
    );

    useEffect(() => {
      const node = contentRef.current;
      if (!node || typeof ResizeObserver === 'undefined') {
        return undefined;
      }

      const measure = () => setContentHeight(node.clientHeight);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);

      return () => observer.disconnect();
    }, []);

    // Pages keep every row at a TV-readable height instead of squeezing the list.
    const pages = useMemo(
      () =>
        paginateDashboardGanttItems(
          timelineItems,
          getDashboardGanttPageSize(contentHeight || FALLBACK_CONTENT_HEIGHT),
        ),
      [contentHeight, timelineItems],
    );
    const hasTaskList = Boolean(cardId && taskListId);
    const slotCount = Math.max(1, pages.length) + (hasTaskList ? 1 : 0);
    const currentSlot = slotIndex % slotCount;
    const activeView = hasTaskList && currentSlot === slotCount - 1 ? 'taskList' : 'gantt';
    const pageIndex = Math.min(currentSlot, Math.max(0, pages.length - 1));
    const slotSeconds = rotationSeconds || DEFAULT_SLOT_SECONDS;

    useEffect(() => {
      setSlotIndex(0);

      if (slotCount <= 1) {
        return undefined;
      }

      const intervalId = window.setInterval(() => {
        setSlotIndex((previous) => (previous + 1) % slotCount);
      }, slotSeconds * 1000);

      return () => window.clearInterval(intervalId);
    }, [slotCount, slotSeconds]);

    const pageItems = pages[pageIndex] || timelineItems;
    const pageLinks = useMemo(
      () => filterDashboardGanttLinks(timelineLinks, pageItems),
      [pageItems, timelineLinks],
    );

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
          {!isLoading && plan?.isEnabled && (
            <small>
              {timelineItems.length} tarefas planeadas
              {pages.length > 1 && ` · página ${pageIndex + 1}/${pages.length}`}
            </small>
          )}
        </header>
        <div
          ref={contentRef}
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
            <div className={styles.page} key={pageIndex}>
              <GanttTimelineAdapter
                items={pageItems}
                links={pageLinks}
                zoomLevel={zoomLevel}
                readonly
                variant="dashboard"
              />
            </div>
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
        {slotCount > 1 && (
          <span
            aria-hidden="true"
            className={styles.rotationProgress}
            key={`${currentSlot}-${slotCount}`}
            style={{ animationDuration: `${slotSeconds}s` }}
          />
        )}
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
