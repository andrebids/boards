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
import DashboardNewsTicker from './DashboardNewsTicker';
import DashboardWidgetContent from './widgets/DashboardWidgetContent';

import styles from './DashboardWorkspace.module.scss';

const WIDGET_LABELS = {
  attention: 'Atenção',
  progress: 'Progresso',
  status: 'Estado',
  upcoming: 'Próximas tarefas',
  blachereProducts: 'Blachere Products',
  blachereStatic: 'Static',
  blachereAnimated: 'Animated',
  codexUsage: 'Uso do Codex',
};

const DashboardWidgetActionsContext = React.createContext({
  canEdit: false,
  canRemove: false,
  isEditor: false,
  onRemove: () => {},
  onToggleTask: () => {},
  taskStatesByWidget: {},
});

const DashboardWidget = React.memo(({ widget }) => {
  const { canEdit, canRemove, isEditor, onRemove, onToggleTask, taskStatesByWidget } =
    React.useContext(DashboardWidgetActionsContext);
  const taskStates = taskStatesByWidget[widget.id];
  const widgetWithCurrentTaskStates = taskStates
    ? {
        ...widget,
        config: { ...widget.config, taskStates },
      }
    : widget;

  return (
    <div className={styles.widgetFrame}>
      {isEditor && (
        <div aria-hidden="true" className={styles.dragHandle}>
          <span>⠿</span>
          Arrastar
        </div>
      )}
      <div className={styles.widgetContent}>
        <DashboardWidgetContent
          isEditable={canEdit}
          widget={widgetWithCurrentTaskStates}
          onToggleTask={onToggleTask}
        />
      </div>
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
    </div>
  );
});

DashboardWidget.propTypes = {
  widget: PropTypes.shape({
    config: PropTypes.shape({
      taskStates: PropTypes.objectOf(
        PropTypes.shape({
          twoD: PropTypes.oneOf(['done', 'pending']),
          threeD: PropTypes.oneOf(['done', 'pending']),
        }),
      ),
    }),
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
};

const dashboardWidgetComponents = { DashboardWidget };

const DashboardWorkspace = React.memo(() => {
  const gridComponentRef = useRef(null);
  const saveTimerRef = useRef(null);
  const layoutVersionRef = useRef(null);
  const isLoadingGridRef = useRef(false);
  const gridLoadTimerRef = useRef(null);
  const loadedGridLayoutRef = useRef(null);
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
  const dashboardLayoutRef = useRef(dashboardLayout);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [canEditDashboard, setCanEditDashboard] = useState(false);

  const setCurrentDashboardLayout = useCallback((nextLayout) => {
    dashboardLayoutRef.current = nextLayout;
    setDashboardLayout(nextLayout);
  }, []);

  const applyDashboard = useCallback(
    (dashboard) => {
      const layout = dashboardLayoutHelpers.normalizeDashboardLayout(dashboard.layout || []);
      const nextLayout =
        layout.length > 0 || dashboard.version > 1
          ? layout
          : dashboardLayoutHelpers.createDefaultDashboardLayout();

      layoutVersionRef.current = dashboard.version;
      setCurrentDashboardLayout(nextLayout);

      return nextLayout;
    },
    [setCurrentDashboardLayout],
  );

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

  const loadGridLayout = useCallback((layout) => {
    const grid = gridComponentRef.current?.getGrid();

    if (!grid) {
      return;
    }

    isLoadingGridRef.current = true;
    window.clearTimeout(gridLoadTimerRef.current);
    grid.load(layout.map(dashboardLayoutHelpers.toGridStackDashboardWidget));
    gridLoadTimerRef.current = window.setTimeout(() => {
      isLoadingGridRef.current = false;
    });
  }, []);

  const persistGridLayout = useCallback(() => {
    const grid = gridComponentRef.current?.getGrid();

    if (!canEditDashboard || !grid || isLoadingGridRef.current || grid.isIgnoreChangeCB()) {
      return;
    }

    const nextLayout = dashboardLayoutHelpers.fromGridStackDashboardWidgets(
      grid.save(false),
      dashboardLayoutRef.current,
    );
    setCurrentDashboardLayout(nextLayout);
    scheduleLayoutSave(nextLayout);
  }, [canEditDashboard, scheduleLayoutSave, setCurrentDashboardLayout]);

  // The GridStack React component consumes `options.children` only when it mounts.
  // The dashboard layout arrives asynchronously, so load it explicitly after the
  // grid is ready rather than expecting a later options update to add the items.
  useEffect(() => {
    if (isDashboardLoading) {
      return undefined;
    }

    if (
      !dashboardLayoutHelpers.hasDashboardGridChanged(loadedGridLayoutRef.current, dashboardLayout)
    ) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      loadGridLayout(dashboardLayout);
      loadedGridLayoutRef.current = dashboardLayout;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [dashboardLayout, isDashboardLoading, loadGridLayout]);

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

      applyDashboard(item);
    };

    socket.on('dashboardUpdate', handleDashboardUpdate);
    return () => socket.off('dashboardUpdate', handleDashboardUpdate);
  }, [applyDashboard]);

  useEffect(
    () => () => {
      window.clearTimeout(saveTimerRef.current);
      window.clearTimeout(gridLoadTimerRef.current);
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

      const currentLayout = dashboardLayoutRef.current;
      const nextLayout = [
        ...currentLayout,
        dashboardLayoutHelpers.placeDashboardWidget(currentLayout, widget),
      ];
      setCurrentDashboardLayout(nextLayout);
      scheduleLayoutSave(nextLayout);
    },
    [canEditDashboard, scheduleLayoutSave, setCurrentDashboardLayout],
  );

  const handleAddGantt = useCallback(() => {
    if (ganttProjectId) {
      handleAddWidget('gantt', {
        projectId: ganttProjectId,
        zoomLevel: 'week',
      });
    }
  }, [ganttProjectId, handleAddWidget]);

  const handleRemoveWidget = useCallback(
    (widgetId) => {
      if (!canEditDashboard) {
        return;
      }

      const nextLayout = dashboardLayoutHelpers.removeDashboardWidget(
        dashboardLayoutRef.current,
        widgetId,
      );
      setCurrentDashboardLayout(nextLayout);
      scheduleLayoutSave(nextLayout);
    },
    [canEditDashboard, scheduleLayoutSave, setCurrentDashboardLayout],
  );

  const handleToggleBlachereTask = useCallback(
    (widgetId, taskId, column) => {
      if (!canEditDashboard) {
        return;
      }

      const nextLayout = dashboardLayoutRef.current.map((widget) => {
        if (
          widget.id !== widgetId ||
          (widget.type !== 'blachereStatic' && widget.type !== 'blachereAnimated')
        ) {
          return widget;
        }

        const taskStates = widget.config?.taskStates || {};
        const currentStatus = taskStates[taskId]?.[column] || 'pending';

        return {
          ...widget,
          config: {
            ...widget.config,
            taskStates: {
              ...taskStates,
              [taskId]: {
                ...taskStates[taskId],
                [column]: currentStatus === 'done' ? 'pending' : 'done',
              },
            },
          },
        };
      });

      setCurrentDashboardLayout(nextLayout);
      scheduleLayoutSave(nextLayout);
    },
    [canEditDashboard, scheduleLayoutSave, setCurrentDashboardLayout],
  );

  const taskStatesByWidget = useMemo(
    () =>
      dashboardLayout.reduce((result, widget) => {
        if (widget.config?.taskStates) {
          return { ...result, [widget.id]: widget.config.taskStates };
        }

        return result;
      }, {}),
    [dashboardLayout],
  );

  const widgetActions = useMemo(
    () => ({
      canEdit: !isTvMode && canEditDashboard,
      canRemove: !isTvMode && canEditDashboard,
      isEditor: !isTvMode,
      onRemove: handleRemoveWidget,
      onToggleTask: handleToggleBlachereTask,
      taskStatesByWidget,
    }),
    [canEditDashboard, handleRemoveWidget, handleToggleBlachereTask, isTvMode, taskStatesByWidget],
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
      draggable: { handle: `.${styles.dragHandle}` },
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
      {isTvMode && <DashboardNewsTicker />}
    </main>
  );
});

export default DashboardWorkspace;
