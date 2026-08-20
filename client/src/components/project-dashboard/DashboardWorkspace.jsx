import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

import api, { socket } from '../../api';
import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import { UserRoles } from '../../constants/Enums';
import {
  createDefaultDashboardLayout,
  DASHBOARD_WIDGETS,
  mergeDashboardLayoutGeometry,
  normalizeDashboardLayout,
} from './dashboardLayout';
import DashboardWidgetContent from './widgets/DashboardWidgetContent';

import styles from './DashboardWorkspace.module.scss';

const DashboardWorkspace = React.memo(() => {
  const gridRef = useRef(null);
  const gridInstanceRef = useRef(null);
  const saveTimerRef = useRef(null);
  const layoutVersionRef = useRef(null);
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
  const [dashboardLayout, setDashboardLayout] = useState(createDefaultDashboardLayout);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [canEditDashboard, setCanEditDashboard] = useState(false);

  const applyDashboard = useCallback((dashboard) => {
    const layout = normalizeDashboardLayout(dashboard.layout || []);
    layoutVersionRef.current = dashboard.version;
    setDashboardLayout(layout.length > 0 ? layout : createDefaultDashboardLayout());
  }, []);

  const loadDashboard = useCallback(async () => {
    const body = await api.getDashboard();
    applyDashboard(body.item);
    return body;
  }, [applyDashboard]);

  useEffect(() => {
    if (!isPreviewAllowed) {
      return undefined;
    }

    let isCancelled = false;
    setIsDashboardLoading(true);
    setDashboardError(false);

    loadDashboard()
      .catch(() => {
        if (!isCancelled) {
          setDashboardError(true);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsDashboardLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isPreviewAllowed, loadDashboard]);

  useEffect(() => {
    if (!isPreviewAllowed || isTvMode || isDashboardLoading) {
      return undefined;
    }

    let isCancelled = false;
    const acquireLock = async () => {
      try {
        const body = await api.acquireDashboardEditLock();
        if (!isCancelled) {
          layoutVersionRef.current = body.item.version;
          setCanEditDashboard(true);
        }
      } catch {
        if (!isCancelled) {
          setCanEditDashboard(false);
        }
      }
    };

    acquireLock();
    const intervalId = window.setInterval(acquireLock, 30000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      api.releaseDashboardEditLock().catch(() => {});
    };
  }, [isDashboardLoading, isPreviewAllowed, isTvMode]);

  useEffect(() => {
    const handleDashboardUpdate = ({ item }) => {
      if (!item || item.version === layoutVersionRef.current) {
        return;
      }

      applyDashboard(item);
      window.requestAnimationFrame(() => gridInstanceRef.current?.load(item.layout));
    };

    socket.on('dashboardUpdate', handleDashboardUpdate);
    return () => socket.off('dashboardUpdate', handleDashboardUpdate);
  }, [applyDashboard]);

  const scheduleLayoutSave = useCallback(
    (nextLayout) => {
      if (!canEditDashboard) {
        return;
      }

      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        try {
          const body = await api.updateDashboard(nextLayout, layoutVersionRef.current);
          applyDashboard(body.item);
        } catch {
          setCanEditDashboard(false);
          setDashboardError(true);
        }
      }, 400);
    },
    [applyDashboard, canEditDashboard],
  );

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

      const nextLayout = [
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
      scheduleLayoutSave(nextLayout);
      return nextLayout;
    });

    window.requestAnimationFrame(() => {
      const item = gridRef.current?.querySelector(`[data-gs-id="${id}"]`);
      if (item) {
        gridInstanceRef.current?.makeWidget(item);
      }
    });
  }, [ganttProjectId, scheduleLayoutSave]);

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
        disableDrag: isTvMode || !canEditDashboard,
        disableResize: isTvMode || !canEditDashboard,
        float: false,
        margin: 12,
        removable: '#dashboard-trash',
        staticGrid: isTvMode,
      },
      gridRef.current,
    );

    if (!isTvMode && canEditDashboard) {
      const persistGridLayout = () => {
        if (grid.isIgnoreChangeCB()) {
          return;
        }

        setDashboardLayout((previousLayout) => {
          const nextLayout = mergeDashboardLayoutGeometry(previousLayout, grid.save(false));
          scheduleLayoutSave(nextLayout);
          return nextLayout;
        });
      };

      grid.on('dragstop resizestop', persistGridLayout);

      grid.on('removed', () => {
        persistGridLayout();
      });
    }

    gridInstanceRef.current = grid;

    if (!isTvMode && canEditDashboard) {
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
  }, [canEditDashboard, isPreviewAllowed, isTvMode, scheduleLayoutSave]);

  if (!isPreviewAllowed) {
    return (
      <main className={styles.accessDenied} role="alert">
        <h1>Dashboard indisponível</h1>
        <p>Esta página está reservada a developers autorizados.</p>
      </main>
    );
  }

  if (isDashboardLoading) {
    return <main className={styles.accessDenied}>A carregar dashboard…</main>;
  }

  return (
    <main className={`${styles.workspace} ${isTvMode ? styles.tvMode : ''}`}>
      {!isTvMode && (
        <header className={styles.toolbar}>
          <div>
            <h1>Dashboard TV</h1>
            <p>Arraste widgets para o canvas e ajuste o espaço livremente.</p>
            {!canEditDashboard && (
              <p className={styles.lockHint}>Outro administrador está a editar o dashboard.</p>
            )}
            {dashboardError && (
              <p className={styles.lockHint}>Não foi possível gravar a alteração mais recente.</p>
            )}
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
            {canEditDashboard && (
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
            )}
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
      {!isTvMode && canEditDashboard && (
        <div className={styles.trash} id="dashboard-trash">
          Largar aqui para remover
        </div>
      )}
    </main>
  );
});

export default DashboardWorkspace;
