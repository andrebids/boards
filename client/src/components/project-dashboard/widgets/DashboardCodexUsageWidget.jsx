import React from 'react';

import styles from './DashboardCodexUsageWidget.module.scss';

const DashboardCodexUsageWidget = React.memo(() => (
  <section className={styles.wrapper} aria-labelledby="codex-usage-title">
    <header className={styles.header}>
      <div>
        <span>Codex Desktop</span>
        <strong id="codex-usage-title">Uso do Codex</strong>
      </div>
      <span className={styles.status}>A aguardar ligação</span>
    </header>
    <div className={styles.content} role="status">
      <span className={styles.value} aria-label="Uso ainda indisponível">
        —
      </span>
      <strong>Sem dados locais</strong>
      <p>Quando o bridge estiver ligado, este cartão mostra o uso semanal e a hora de renovação.</p>
    </div>
    <footer className={styles.footer}>
      <span>Origem: Codex local</span>
      <span>Atualização automática</span>
    </footer>
  </section>
));

export default DashboardCodexUsageWidget;
