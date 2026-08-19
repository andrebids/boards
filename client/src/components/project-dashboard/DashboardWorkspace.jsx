import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

import selectors from '../../selectors';
import { UserRoles } from '../../constants/Enums';
import { createDefaultDashboardLayout } from './dashboardLayout';

import styles from './DashboardWorkspace.module.scss';

const DashboardWorkspace = React.memo(() => {
  const gridRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const user = useSelector(selectors.selectCurrentUser);
  const isTvMode = searchParams.get('tv') === '1';
  const isPreviewAllowed = user?.role === UserRoles.ADMIN;

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
      const savedLayout = window.localStorage.getItem('planka-dashboard-layout');

      if (savedLayout) {
        try {
          grid.load(JSON.parse(savedLayout));
        } catch {
          window.localStorage.removeItem('planka-dashboard-layout');
        }
      }

      grid.on('change', () => {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          window.localStorage.setItem('planka-dashboard-layout', JSON.stringify(grid.save()));
        }, 400);
      });
    }

    if (!isTvMode) {
      GridStack.setupDragIn(
        '.dashboard-widget-template',
        { appendTo: 'body', helper: 'clone' },
        { h: 3, w: 4 },
      );
    }

    return () => {
      window.clearTimeout(saveTimerRef.current);
      grid.destroy(false);
    };
  }, [isPreviewAllowed, isTvMode]);

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
          </aside>
        )}
        <section className={`grid-stack ${styles.grid}`} ref={gridRef} aria-label="Dashboard TV">
          {createDefaultDashboardLayout().map((widget) => (
            <article
              className="grid-stack-item"
              data-gs-h={widget.h}
              data-gs-id={widget.id}
              data-gs-max-h={widget.type === 'progress' ? 10 : undefined}
              data-gs-max-w={widget.type === 'progress' ? 12 : undefined}
              data-gs-min-h={widget.type === 'upcoming' ? 3 : undefined}
              data-gs-min-w={widget.type === 'upcoming' ? 2 : undefined}
              data-gs-w={widget.w}
              data-gs-x={widget.x}
              data-gs-y={widget.y}
              key={widget.id}
            >
              <div className={`grid-stack-item-content ${styles.widget}`}>
                <span>{widget.type === 'progress' ? 'Visão geral' : widget.type}</span>
                <strong>{widget.id === 'overview' ? 'Dashboard TV' : 'Exemplo'}</strong>
              </div>
            </article>
          ))}
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
