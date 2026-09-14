import React, { useEffect, useState } from 'react';

import styles from './DashboardTvDiagnostics.module.scss';

const REFRESH_INTERVAL_MS = 1000;

const supports = (declaration) =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports(declaration)
    : false;

const readSnapshot = () => ({
  viewport: `${window.innerWidth} × ${window.innerHeight}`,
  screen: `${window.screen?.width || '?'} × ${window.screen?.height || '?'}`,
  dpr: window.devicePixelRatio,
  meta: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '(sem meta)',
  containerQueries: supports('container-type: size'),
  oklch: supports('color: oklch(0.5 0 0)'),
  colorMix: supports('color: color-mix(in oklab, red 50%, blue)'),
  dvh: supports('height: 100dvh'),
  userAgent: window.navigator.userAgent,
});

// Shown with ?tv=1&debug=1: a large, photographable summary of what the TV browser
// actually renders, so sizing can be tuned from facts instead of guesses.
const DashboardTvDiagnostics = React.memo(() => {
  const [snapshot, setSnapshot] = useState(readSnapshot);

  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener('resize', refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('resize', refresh);
    };
  }, []);

  const flag = (value) => (value ? 'sim' : 'NÃO');

  return (
    <aside className={styles.panel} aria-label="Diagnóstico do modo TV">
      <h2>Diagnóstico TV</h2>
      <dl>
        <dt>Viewport CSS</dt>
        <dd>{snapshot.viewport}</dd>
        <dt>Ecrã</dt>
        <dd>
          {snapshot.screen} · DPR {snapshot.dpr}
        </dd>
        <dt>Meta viewport</dt>
        <dd>{snapshot.meta}</dd>
        <dt>Container queries</dt>
        <dd>{flag(snapshot.containerQueries)}</dd>
        <dt>oklch / color-mix</dt>
        <dd>
          {flag(snapshot.oklch)} / {flag(snapshot.colorMix)}
        </dd>
        <dt>dvh</dt>
        <dd>{flag(snapshot.dvh)}</dd>
        <dt>User agent</dt>
        <dd className={styles.userAgent}>{snapshot.userAgent}</dd>
      </dl>
    </aside>
  );
});

export default DashboardTvDiagnostics;
