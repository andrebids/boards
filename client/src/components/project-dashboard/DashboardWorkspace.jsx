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
        cellHeight: 76,
        column: 12,
        disableDrag: isTvMode,
        disableResize: isTvMode,
        float: false,
        margin: 12,
        removable: '#dashboard-trash',
      },
      gridRef.current,
    );

    if (!isTvMode) {
      GridStack.setupDragIn(
        '.dashboard-widget-template',
        { appendTo: 'body', helper: 'clone' },
        { h: 3, w: 4 },
      );
    }

    return () => grid.destroy(false);
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
              data-gs-w={widget.w}
              data-gs-x={widget.x}
              data-gs-y={widget.y}
              key={widget.id}
            >
              <div className={`grid-stack-item-content ${styles.widget}`}>
                <span>{widget.type}</span>
                <strong>Em breve</strong>
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
