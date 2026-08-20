import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import { UserRoles } from '../../constants/Enums';
import {
  createDefaultDashboardLayout,
  DASHBOARD_WIDGETS,
  normalizeDashboardLayout,
} from './dashboardLayout';
import DashboardWidgetContent from './widgets/DashboardWidgetContent';

import styles from './DashboardWorkspace.module.scss';

const DashboardWorkspace = React.memo(() => {
  const gridRef = useRef(null);
  const gridInstanceRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const user = useSelector(selectors.selectCurrentUser);
  const projects = useSelector((state) => {
    const projectIds = selectors.selectProjectIdsForCurrentUser(state) || [];
    return projectIds
      .map((projectId) => selectors.selectProjectById(state, projectId))
      .filter(Boolean);
  });
  const isTvMode = searchParams.get('tv') === '1';
  const isPreviewAllowed = user?.role === UserRoles.ADMIN;
  const [ganttProjectId, setGanttProjectId] = useState('');
  const [dashboardLayout, setDashboardLayout] = useState(() => {
    const savedLayout = window.localStorage.getItem('planka-dashboard-layout');

    if (!savedLayout) {
      return createDefaultDashboardLayout();
    }

    try {
      return normalizeDashboardLayout(JSON.parse(savedLayout));
    } catch {
      window.localStorage.removeItem('planka-dashboard-layout');
      return createDefaultDashboardLayout();
    }
  });

  const updateLayoutFromGrid = useCallback((nodes) => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    setDashboardLayout((previousLayout) =>
      previousLayout.map((widget) => {
        const node = nodesById.get(widget.id);

        return node ? { ...widget, x: node.x, y: node.y, w: node.w, h: node.h } : widget;
      }),
    );
  }, []);

  const handleAddGantt = useCallback(() => {
    if (!ganttProjectId) {
      return;
    }

    const id = `gantt-${Date.now()}`;
    setDashboardLayout((previousLayout) => {
      const y = previousLayout.reduce(
        (maximum, widget) => Math.max(maximum, widget.y + widget.h),
        0,
      );

      return [
        ...previousLayout,
        {
          id,
          type: 'gantt',
          x: 0,
          y,
          w: 12,
          h: 7,
          config: { projectId: ganttProjectId, zoomLevel: 'week' },
        },
      ];
    });

    window.requestAnimationFrame(() => {
      const item = gridRef.current?.querySelector(`[data-gs-id="${id}"]`);
      if (item) {
        gridInstanceRef.current?.makeWidget(item);
      }
    });
  }, [ganttProjectId]);

  useEffect(() => {
    if (isTvMode) {
      return undefined;
    }

    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem('planka-dashboard-layout', JSON.stringify(dashboardLayout));
    }, 400);

    return () => window.clearTimeout(saveTimerRef.current);
  }, [dashboardLayout, isTvMode]);

  useEffect(() => {
    if (!isPreviewAllowed || !gridRef.current) {
      return undefined;
    }

    const grid = GridStack.init(
      {
        acceptWidgets: true,
        cellHeight: 88,
        column: 12,
        columnOpts: { breakpoints: [{ c: 1, w: 760 }] },
        disableDrag: isTvMode,
        disableResize: isTvMode,
        float: false,
        margin: 12,
        removable: '#dashboard-trash',
        staticGrid: isTvMode,
      },
      gridRef.current,
    );

    if (!isTvMode) {
      grid.on('change', (_, nodes) => {
        updateLayoutFromGrid(nodes);
      });

      grid.on('removed', (_, nodes) => {
        const removedIds = new Set(nodes.map((node) => node.id));
        setDashboardLayout((previousLayout) =>
          previousLayout.filter((widget) => !removedIds.has(widget.id)),
        );
      });
    }

    gridInstanceRef.current = grid;

    if (!isTvMode) {
      GridStack.setupDragIn(
        '.dashboard-widget-template',
        { appendTo: 'body', helper: 'clone' },
        { h: 3, w: 4 },
      );
    }

    return () => {
      window.clearTimeout(saveTimerRef.current);
      gridInstanceRef.current = null;
      grid.destroy(false);
    };
  }, [isPreviewAllowed, isTvMode, updateLayoutFromGrid]);

  if (!isPreviewAllowed) {
    return (
      <main className={styles.accessDenied} role="alert">
        <h1>Dashboard indisponível</h1>
        <p>Esta página está reservada a developers autorizados.</p>
      </main>
    );
  }

  return (
    <main className={`${styles.workspace} ${isTvMode ? styles.tvMode : ''}`}>
      {!isTvMode && (
        <header className={styles.toolbar}>
          <div>
            <h1>Dashboard TV</h1>
            <p>Arraste widgets para o canvas e ajuste o espaço livremente.</p>
          </div>
        </header>
      )}
      <div className={styles.editorLayout}>
        {!isTvMode && (
          <aside className={styles.widgetLibrary} aria-label="Widgets disponíveis">
            <span className={styles.libraryLabel}>Adicionar widget</span>
            <div className={`${styles.widgetTemplate} dashboard-widget-template`}>Progresso</div>
            <div className={`${styles.widgetTemplate} dashboard-widget-template`}>Estado</div>
            <div className={`${styles.widgetTemplate} dashboard-widget-template`}>
              Próximas tarefas
            </div>
            <div className={`${styles.widgetTemplate} dashboard-widget-template`}>Atenção</div>
            <div className={styles.ganttAdder}>
              <span>Gantt por projeto</span>
              <select
                aria-label="Gantt por projeto"
                value={ganttProjectId}
                onChange={(event) => setGanttProjectId(event.target.value)}
              >
                <option value="">Selecionar projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                disabled={!ganttProjectId}
                onClick={handleAddGantt}
              >
                Adicionar Gantt
              </Button>
            </div>
          </aside>
        )}
        <section className={`grid-stack ${styles.grid}`} ref={gridRef} aria-label="Dashboard TV">
          {dashboardLayout.map((widget) => {
            const constraints = DASHBOARD_WIDGETS[widget.type];

            return (
              <article
                className="grid-stack-item"
                data-gs-h={widget.h}
                data-gs-id={widget.id}
                data-gs-max-h={constraints.maxH}
                data-gs-max-w={constraints.maxW}
                data-gs-min-h={constraints.minH}
                data-gs-min-w={constraints.minW}
                data-gs-w={widget.w}
                data-gs-x={widget.x}
                data-gs-y={widget.y}
                key={widget.id}
              >
                <div className="grid-stack-item-content">
                  <DashboardWidgetContent widget={widget} />
                </div>
              </article>
            );
          })}
        </section>
      </div>
      {!isTvMode && (
        <div className={styles.trash} id="dashboard-trash">
          Largar aqui para remover
        </div>
      )}
    </main>
  );
});

export default DashboardWorkspace;
