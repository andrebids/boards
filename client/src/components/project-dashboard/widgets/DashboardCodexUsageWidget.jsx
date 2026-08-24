import React, { useEffect, useState } from "react";

import api from "../../../api";

import styles from "./DashboardCodexUsageWidget.module.scss";

const USAGE_REFRESH_INTERVAL_MS = 60 * 1000;

const normalizeUsagePercent = (usagePercent) => {
  if (!Number.isFinite(usagePercent)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(usagePercent)));
};

const formatRenewal = (resetsAt) => {
  if (!Number.isSafeInteger(resetsAt) || resetsAt <= 0) {
    return null;
  }

  const renewalDate = new Date(resetsAt * 1000);
  if (Number.isNaN(renewalDate.getTime())) {
    return null;
  }

  return {
    dateTime: renewalDate.toISOString(),
    label: new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(renewalDate),
  };
};

const DashboardCodexUsageWidget = React.memo(() => {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    const loadUsage = () => {
      api
        .getDashboardCodexUsage()
        .then(({ item }) => {
          if (!isCancelled) {
            setUsage(item || null);
          }
        })
        .catch(() => {});
    };

    loadUsage();
    const intervalId = window.setInterval(loadUsage, USAGE_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const usedPercent = normalizeUsagePercent(usage?.usedPercent);
  const hasUsage = usedPercent !== null;
  const remainingPercent = hasUsage ? 100 - usedPercent : null;
  const displayedPercent = hasUsage ? `${remainingPercent}%` : "—";
  const renewal = formatRenewal(usage?.resetsAt);

  return (
    <section className={styles.wrapper} aria-label="Uso semanal do Codex">
      <div
        className={styles.gauge}
        role="status"
        aria-label={
          hasUsage
            ? `Uso semanal do Codex: ${remainingPercent}% restante, ${usedPercent}% utilizado${
                renewal ? `, repõe ${renewal.label}` : ""
              }`
            : "Uso semanal ainda indisponível"
        }
      >
        <svg
          className={styles.gaugeSvg}
          viewBox="0 0 240 142"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={styles.track}
            d="M 30 120 A 90 90 0 0 1 210 120"
            pathLength="100"
          />
          <path
            className={styles.fill}
            d="M 30 120 A 90 90 0 0 1 210 120"
            pathLength="100"
            strokeDasharray={hasUsage ? `${remainingPercent} 100` : "0 100"}
          />
        </svg>
        <div className={styles.reading} aria-live="polite">
          <strong>{displayedPercent}</strong>
          {hasUsage && <span>restante</span>}
        </div>
      </div>
      <div className={styles.details}>
        {renewal && (
          <time dateTime={renewal.dateTime}>Repõe {renewal.label}</time>
        )}
      </div>
    </section>
  );
});

export default DashboardCodexUsageWidget;
