import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { GridStack as GridStackReact } from 'gridstack/dist/react';
import 'gridstack/dist/gridstack.min.css';

import api, { socket } from '../../api';
import { Button } from '../../lib/custom-ui';
import selectors from '../../selectors';
import { UserRoles } from '../../constants/Enums';
import * as dashboardLayoutHelpers from './dashboardLayout';
import DashboardWidgetContent from './widgets/DashboardWidgetContent';

import styles from './DashboardWorkspace.module.scss';

const WIDGET_LABELS = {
  attention: 'Atenção',
  progress: 'Progresso',
  status: 'Estado',
  upcoming: 'Próximas tarefas',
};

const DashboardWidgetActionsContext = React.createContext({
  canRemove: false,
  onRemove: () => {},
});

const DashboardWidget = React.memo(({ widget }) => {
  const { canRemove, onRemove } = React.useContext(DashboardWidgetActionsContext);

  return (
    <>
      <DashboardWidgetContent widget={widget} />
      {canRemove && (
        <button
          aria-label={`Remover widget ${WIDGET_LABELS[widget.type] || 'Gantt'}`}
          className={styles.removeWidget}
          title="Remover widget"
          type="button"
          onClick={() => onRemove(widget.id)}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          ×
        </button>
      )}
    </>
  );
});

DashboardWidget.propTypes = {
  widget: PropTypes.object.isRequired,
};

const dashboardWidgetComponents = { DashboardWidget };

const DashboardWorkspace = React.memo(() => {
  const gridComponentRef = useRef(null);
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
  const [dashboardLayout, setDashboardLayout] = useState(
    dashboardLayoutHelpers.createDefaultDashboardLayout,
  );
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [canEditDashboard, setCanEditDashboard] = useState(false);

  const applyDashboard = useCallback((dashboard) => {
    const layout = dashboardLayoutHelpers.normalizeDashboardLayout(dashboard.layout || []);
    const nextLayout =
      layout.length > 0 || dashboard.version > 1
        ? layout
        : dashboardLayoutHelpers.createDefaultDashboardLayout();

    layoutVersionRef.current = dashboard.version;
    setDashboardLayout(nextLayout);

    return nextLayout;
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

  const persistGridLayout = useCallback(() => {
    const grid = gridComponentRef.current?.getGrid();

    if (!canEditDashboard || !grid || grid.isIgnoreChangeCB()) {
      return;
    }

    const nextLayout = dashboardLayoutHelpers.fromGridStackDashboardWidgets(grid.save(false));
    scheduleLayoutSave(nextLayout);
  }, [canEditDashboard, scheduleLayoutSave]);

  // The GridStack React component consumes `options.children` only when it mounts.
  // The dashboard layout arrives asynchronously, so load it explicitly after the
  // grid is ready rather than expecting a later options update to add the items.
  useEffect(() => {
    if (isDashboardLoading) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      gridComponentRef.current
        ?.getGrid()
        ?.load(dashboardLayout.map(dashboardLayoutHelpers.toGridStackDashboardWidget));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [dashboardLayout, isDashboardLoading]);

  // GridStack can be mounted while the edit lock is still being acquired. Apply
  // the final interaction state directly once the lock result is known.
  useEffect(() => {
    const grid = gridComponentRef.current?.getGrid();

    if (!grid || isTvMode) {
      return;
    }

    grid.enableMove(canEditDashboard);
    grid.enableResize(canEditDashboard);
  }, [canEditDashboard, isTvMode]);

  useEffect(() => {
    const handleDashboardUpdate = ({ item }) => {
      if (!item || item.version === layoutVersionRef.current) {
        return;
      }

      const layout = applyDashboard(item);
      window.requestAnimationFrame(() => {
        gridComponentRef.current
          ?.getGrid()
          ?.load(layout.map(dashboardLayoutHelpers.toGridStackDashboardWidget));
      });
    };

    socket.on('dashboardUpdate', handleDashboardUpdate);
    return () => socket.off('dashboardUpdate', handleDashboardUpdate);
  }, [applyDashboard]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handleAddWidget = useCallback(
    (type, config) => {
      if (!canEditDashboard) {
        return;
      }

      const constraints = dashboardLayoutHelpers.DASHBOARD_WIDGETS[type];
      const widget = {
        h: type === 'gantt' ? 7 : constraints.minH,
        id: `${type}-${Date.now()}`,
        type,
        w: constraints.editorMinW || constraints.minW,
        ...(config && { config }),
      };

      const nextLayout = [
        ...dashboardLayout,
        dashboardLayoutHelpers.placeDashboardWidget(dashboardLayout, widget),
      ];
      setDashboardLayout(nextLayout);
      scheduleLayoutSave(nextLayout);
    },
    [canEditDashboard, dashboardLayout, scheduleLayoutSave],
  );

  const handleAddGantt = useCallback(() => {
    if (ganttProjectId) {
      handleAddWidget('gantt', { projectId: ganttProjectId, zoomLevel: 'week' });
    }
  }, [ganttProjectId, handleAddWidget]);

  const handleRemoveWidget = useCallback(
    (widgetId) => {
      if (!canEditDashboard) {
        return;
      }

      const nextLayout = dashboardLayoutHelpers.removeDashboardWidget(dashboardLayout, widgetId);
      setDashboardLayout(nextLayout);
      scheduleLayoutSave(nextLayout);
    },
    [canEditDashboard, dashboardLayout, scheduleLayoutSave],
  );

  const widgetActions = useMemo(
    () => ({
      canRemove: !isTvMode && canEditDashboard,
      onRemove: handleRemoveWidget,
    }),
    [canEditDashboard, handleRemoveWidget, isTvMode],
  );

  const gridOptions = useMemo(
    () => ({
      acceptWidgets: false,
      cellHeight: 88,
      children: dashboardLayout.map(dashboardLayoutHelpers.toGridStackDashboardWidget),
      column: 12,
      columnOpts: { breakpoints: [{ c: 1, w: 760 }] },
      disableDrag: isTvMode || !canEditDashboard,
      disableResize: isTvMode || !canEditDashboard,
      float: false,
      margin: 12,
      resizable: { handles: 'se' },
      staticGrid: isTvMode,
    }),
    [canEditDashboard, dashboardLayout, isTvMode],
  );

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
            <p>Adicione widgets e ajuste o espaço livremente.</p>
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
            {Object.entries(WIDGET_LABELS).map(([type, label]) => (
              <button
                className={styles.widgetTemplate}
                disabled={!canEditDashboard}
                key={type}
                type="button"
                onClick={() => handleAddWidget(type)}
              >
                {label}
              </button>
            ))}
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
        <section aria-label="Dashboard TV">
          <DashboardWidgetActionsContext.Provider value={widgetActions}>
            <GridStackReact
              className={styles.grid}
              components={dashboardWidgetComponents}
              options={gridOptions}
              ref={gridComponentRef}
              onAdded={persistGridLayout}
              onChange={persistGridLayout}
              onRemoved={persistGridLayout}
            />
          </DashboardWidgetActionsContext.Provider>
        </section>
      </div>
    </main>
  );
});

export default DashboardWorkspace;
