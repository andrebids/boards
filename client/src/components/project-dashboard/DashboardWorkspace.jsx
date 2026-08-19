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
        float: true,
        margin: 12,
      },
      gridRef.current,
    );

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
            <p>Arraste e redimensione os widgets para compor o ecrã.</p>
          </div>
        </header>
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
    </main>
  );
});

export default DashboardWorkspace;
