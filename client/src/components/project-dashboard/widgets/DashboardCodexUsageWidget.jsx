import React from 'react';
import PropTypes from 'prop-types';

import styles from './DashboardCodexUsageWidget.module.scss';

const GAUGE_CENTER = 120;
const GAUGE_RADIUS = 90;
const GAUGE_TICKS = Array.from({ length: 21 }, (_, index) => {
  const angle = Math.PI + (Math.PI * index) / 20;
  const isMajor = index % 5 === 0;
  const outerRadius = GAUGE_RADIUS + 7;
  const innerRadius = GAUGE_RADIUS + (isMajor ? 1 : 4);

  return {
    isMajor,
    key: index,
    x1: GAUGE_CENTER + Math.cos(angle) * innerRadius,
    x2: GAUGE_CENTER + Math.cos(angle) * outerRadius,
    y1: GAUGE_CENTER + Math.sin(angle) * innerRadius,
    y2: GAUGE_CENTER + Math.sin(angle) * outerRadius,
  };
});

const normalizeUsagePercent = (usagePercent) => {
  if (!Number.isFinite(usagePercent)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(usagePercent)));
};

const DashboardCodexUsageWidget = React.memo(({ usagePercent }) => {
  const normalizedUsagePercent = normalizeUsagePercent(usagePercent);
  const hasUsage = normalizedUsagePercent !== null;
  const displayedPercent = hasUsage ? `${normalizedUsagePercent}%` : '—';

  return (
    <section className={styles.wrapper} aria-labelledby="codex-usage-title">
      <header className={styles.header}>
        <span>Codex Desktop</span>
        <strong id="codex-usage-title">Uso semanal</strong>
        <span className={styles.status}>
          <i aria-hidden="true" />
          {hasUsage ? 'Ligado' : 'A aguardar ligação'}
        </span>
      </header>
      <div
        className={styles.gauge}
        role="status"
        aria-label={
          hasUsage
            ? `Uso semanal do Codex: ${normalizedUsagePercent}%`
            : 'Uso semanal ainda indisponível'
        }
      >
        <svg className={styles.gaugeSvg} viewBox="0 0 240 142" aria-hidden="true" focusable="false">
          <path className={styles.track} d="M 30 120 A 90 90 0 0 1 210 120" pathLength="100" />
          <path
            className={styles.fill}
            d="M 30 120 A 90 90 0 0 1 210 120"
            pathLength="100"
            strokeDasharray={hasUsage ? `${normalizedUsagePercent} 100` : '0 100'}
          />
          <g className={styles.ticks}>
            {GAUGE_TICKS.map((tick) => (
              <line
                className={tick.isMajor ? styles.majorTick : undefined}
                key={tick.key}
                x1={tick.x1}
                x2={tick.x2}
                y1={tick.y1}
                y2={tick.y2}
              />
            ))}
          </g>
          <text className={styles.scaleLabel} x="27" y="138">
            0%
          </text>
          <text className={styles.scaleLabel} x="213" y="138" textAnchor="end">
            100%
          </text>
        </svg>
        <div className={styles.reading} aria-live="polite">
          <strong>{displayedPercent}</strong>
          <span>{hasUsage ? 'da janela semanal' : 'Sem dados locais'}</span>
        </div>
      </div>
      <footer className={styles.footer}>
        <span>Origem: Codex local</span>
        <span>{hasUsage ? 'Atualizado agora' : 'Bridge pendente'}</span>
      </footer>
    </section>
  );
});

DashboardCodexUsageWidget.propTypes = {
  usagePercent: PropTypes.number,
};

DashboardCodexUsageWidget.defaultProps = {
  usagePercent: null,
};

export default DashboardCodexUsageWidget;
