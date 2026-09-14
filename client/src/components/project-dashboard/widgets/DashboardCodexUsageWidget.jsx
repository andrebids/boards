import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import api from '../../../api';

import {
  buildActivityCalendar,
  getActivityCalendarWeeks,
  getActivityLevel,
} from './codex-usage-activity';
import { getClaudeUsageStatus, getLimitWindowState } from './claude-usage-status';
import getCodexUsageForecast from './codex-usage-forecast';
import styles from './DashboardCodexUsageWidget.module.scss';

const USAGE_REFRESH_INTERVAL_MS = 60 * 1000;
const TOKEN_UNITS = [
  { threshold: 1e9, suffix: 'B', divisor: 1e9 },
  { threshold: 1e6, suffix: 'M', divisor: 1e6 },
  { threshold: 1e3, suffix: 'K', divisor: 1e3 },
];
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
    label: new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(renewalDate),
  };
};

const formatResetCountdown = (resetsAt, nowMs) => {
  if (!Number.isSafeInteger(resetsAt) || !Number.isFinite(nowMs)) {
    return null;
  }

  const remainingMs = resetsAt * 1000 - nowMs;
  if (remainingMs <= 0) {
    return 'agora';
  }

  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  return `${days}d ${hours}h`;
};

const formatTokenCount = (tokens) => {
  if (!Number.isSafeInteger(tokens) || tokens < 0) {
    return '—';
  }

  const unit = TOKEN_UNITS.find(({ threshold }) => tokens >= threshold);
  const value = unit ? tokens / unit.divisor : tokens;

  return `${new Intl.NumberFormat('pt-PT', {
    maximumFractionDigits: unit ? 2 : 0,
  }).format(value)}${unit ? unit.suffix : ''}`;
};

const formatDuration = (seconds) => {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    return '—';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

function TokenActivity({ activity, emptyMessage, note, stats }) {
  const activityRef = useRef(null);
  const [maximumWeeks, setMaximumWeeks] = useState(() => getActivityCalendarWeeks(600));
  const calendar = buildActivityCalendar(activity?.dailyUsageBuckets, maximumWeeks);
  const hasActivity = Boolean(stats);
  const calendarStyle = {
    '--calendar-columns': calendar.weeks.length,
    '--calendar-width': `${20 + calendar.weeks.length * 24}px`,
  };
  const focusedPeriodLabel = calendar.focusedMonthLabel
    ? `desde ${calendar.focusedMonthLabel}`
    : null;
  const calendarAriaLabel = `Atividade diária de tokens ${
    focusedPeriodLabel || 'nos últimos 12 meses'
  }`;

  useEffect(() => {
    const activityElement = activityRef.current;
    if (!activityElement) {
      return undefined;
    }

    const updateMaximumWeeks = () => {
      setMaximumWeeks(getActivityCalendarWeeks(activityElement.clientWidth));
    };
    updateMaximumWeeks();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(updateMaximumWeeks);
    resizeObserver.observe(activityElement);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={styles.activity} ref={activityRef}>
      <div className={styles.activityHeading}>
        <span>Atividade de tokens</span>
        <small>{focusedPeriodLabel || 'últimos 12 meses'}</small>
      </div>
      {hasActivity ? (
        <>
          <div
            className={`${styles.activityStats} ${stats.length === 4 ? styles.activityStatsFour : ''}`}
          >
            {stats.map(({ label, value }) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.calendar} style={calendarStyle} aria-label={calendarAriaLabel}>
            <div className={styles.monthLabels} aria-hidden="true">
              <span />
              {calendar.monthMarks.map(({ index, label }) => (
                <span key={`${index}-${label}`} style={{ gridColumn: index + 2 }}>
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.calendarGrid} role="img" aria-label={calendarAriaLabel}>
              <div className={styles.weekdayLabels} aria-hidden="true">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {calendar.weeks.map((week) => (
                <div className={styles.week} key={week[0].dateKey}>
                  {week.map(({ dateKey, tokens }) => {
                    const level = getActivityLevel(tokens, calendar.peak);
                    return (
                      <span
                        className={`${styles.day} ${styles[`level${level}`]}`}
                        key={dateKey}
                        title={`${dateKey}: ${tokens.toLocaleString('pt-PT')} tokens`}
                        aria-label={`${dateKey}: ${tokens.toLocaleString('pt-PT')} tokens`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.legend} aria-hidden="true">
              <span>menos</span>
              {[0, 1, 2, 3, 4, 5, 6].map((level) => (
                <i className={`${styles.day} ${styles[`level${level}`]}`} key={level} />
              ))}
              <span>mais</span>
            </div>
          </div>
          {note && <p className={styles.activityNote}>{note}</p>}
        </>
      ) : (
        <p className={styles.activityEmpty}>{emptyMessage}</p>
      )}
    </div>
  );
}

TokenActivity.defaultProps = {
  activity: null,
  emptyMessage: 'A bridge ainda não enviou atividade de tokens.',
  note: null,
  stats: null,
};

TokenActivity.propTypes = {
  emptyMessage: PropTypes.string,
  note: PropTypes.string,
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }),
  ),
  activity: PropTypes.shape({
    dailyUsageBuckets: PropTypes.arrayOf(
      PropTypes.shape({
        startDate: PropTypes.string,
        tokens: PropTypes.number,
      }),
    ),
  }),
};

const getCodexActivityStats = (usage) => {
  const summary = usage?.tokenActivity?.summary;
  if (!summary || !Number.isSafeInteger(summary.lifetimeTokens)) {
    return null;
  }

  return [
    { label: 'Total', value: formatTokenCount(summary.lifetimeTokens) },
    { label: 'Pico diário', value: formatTokenCount(summary.peakDailyTokens) },
    { label: 'Streak', value: `${summary.currentStreakDays}d` },
    { label: 'Melhor', value: `${summary.longestStreakDays}d` },
    { label: 'Tarefa mais longa', value: formatDuration(summary.longestRunningTurnSec) },
  ];
};

const CodexUsagePanel = React.memo(() => {
  const [usage, setUsage] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

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

    const refresh = () => {
      setNowMs(Date.now());
      loadUsage();
    };

    refresh();
    const intervalId = window.setInterval(refresh, USAGE_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const usedPercent = normalizeUsagePercent(usage?.usedPercent);
  const hasUsage = usedPercent !== null;
  const remainingPercent = hasUsage ? 100 - usedPercent : null;
  const displayedPercent = hasUsage ? `${remainingPercent}%` : '—';
  const renewal = formatRenewal(usage?.resetsAt);
  const resetCountdown = formatResetCountdown(usage?.resetsAt, nowMs);
  const forecast = getCodexUsageForecast(usage);
  const forecastDepletion = forecast
    ? formatRenewal(Math.round(forecast.depletesAtMs / 1000))
    : null;
  const forecastDepletionLabel = forecastDepletion?.label.replace(',', ' às');
  const forecastRate = forecast
    ? new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(
        forecast.usedPercentPerHour,
      )
    : null;

  return (
    <section className={styles.wrapper} aria-label="Uso semanal do Codex">
      <div className={styles.weekly}>
        <h2 className={styles.providerName}>Codex</h2>
        <div
          className={styles.gauge}
          role="status"
          aria-label={
            hasUsage
              ? `Uso semanal do Codex: ${remainingPercent}% restante, ${usedPercent}% utilizado${
                  renewal ? `, repõe ${renewal.label}` : ''
                }${
                  forecast && forecastDepletion
                    ? `, ao ritmo médio de ${forecastRate}% por hora esgota ${
                        forecast.isBeforeReset ? 'antes' : 'depois'
                      } do reset, dia ${forecastDepletionLabel}`
                    : ''
                }`
              : 'Uso semanal ainda indisponível'
          }
        >
          <svg
            className={styles.gaugeSvg}
            viewBox="0 0 240 142"
            aria-hidden="true"
            focusable="false"
          >
            <path className={styles.track} d="M 30 120 A 90 90 0 0 1 210 120" pathLength="100" />
            <path
              className={styles.fill}
              d="M 30 120 A 90 90 0 0 1 210 120"
              pathLength="100"
              strokeDasharray={hasUsage ? `${remainingPercent} 100` : '0 100'}
            />
          </svg>
          <div className={styles.reading} aria-live="polite">
            <strong>{displayedPercent}</strong>
            {hasUsage && <span>restante</span>}
          </div>
        </div>
        <div className={styles.details}>
          {hasUsage && <span>{usedPercent}% usado</span>}
          {renewal && resetCountdown && (
            <time dateTime={renewal.dateTime} title={renewal.label}>
              Reset em {resetCountdown}
            </time>
          )}
        </div>
        {forecast && forecastDepletion && (
          <p
            className={styles.forecast}
            title="Estimativa baseada no consumo médio desde o início desta janela"
          >
            Ritmo médio: {forecastRate}%/h.{' '}
            <time dateTime={forecastDepletion.dateTime}>
              Esgota dia {forecastDepletionLabel}, {forecast.isBeforeReset ? 'antes' : 'depois'} do
              reset.
            </time>
          </p>
        )}
      </div>
      <TokenActivity activity={usage?.tokenActivity} stats={getCodexActivityStats(usage)} />
    </section>
  );
});

const getClaudeActivityStats = (usage) => {
  const summary = usage?.tokenActivity?.summary;
  if (!summary || !Number.isSafeInteger(summary.totalTokens)) {
    return null;
  }

  return [
    { label: 'Total local', value: formatTokenCount(summary.totalTokens) },
    { label: 'Pico diário', value: formatTokenCount(summary.peakDailyTokens) },
    { label: 'Streak', value: `${summary.currentStreakDays}d` },
    { label: 'Melhor', value: `${summary.longestStreakDays}d` },
  ];
};

const CLAUDE_WINDOW_STATUS_LABELS = {
  reset: 'reposto',
  unavailable: 'sem leitura',
};

const CLAUDE_STATUS_TONE_CLASSES = {
  error: styles.statusError,
  ok: styles.statusOk,
  warning: styles.statusWarning,
};

const ClaudeUsagePanel = React.memo(() => {
  const [usage, setUsage] = useState(null);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let isCancelled = false;

    const refresh = () => {
      setNowMs(Date.now());
      api
        .getDashboardClaudeUsage()
        .then(({ item }) => {
          if (!isCancelled) {
            setUsage(item || null);
            setHasLoadError(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setHasLoadError(true);
          }
        });
    };

    refresh();
    const intervalId = window.setInterval(refresh, USAGE_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const weekly = getLimitWindowState(usage?.rateLimits?.sevenDay, nowMs);
  const session = getLimitWindowState(usage?.rateLimits?.fiveHour, nowMs);
  const status = getClaudeUsageStatus({ usage, hasLoadError, nowMs });
  const weeklyRenewal = weekly.status === 'available' ? formatRenewal(weekly.resetsAt) : null;
  const sessionRenewal = session.status === 'available' ? formatRenewal(session.resetsAt) : null;

  return (
    <section className={`${styles.wrapper} ${styles.claude}`} aria-label="Utilização do Claude">
      <div className={styles.weekly}>
        <h2 className={styles.providerName}>
          Claude <small>subscrição</small>
        </h2>
        <div
          className={styles.gauge}
          role="status"
          aria-label={
            weekly.status === 'available'
              ? `Limite semanal da subscrição Claude: ${weekly.remainingPercent}% restante, ${
                  weekly.usedPercent
                }% utilizado${weeklyRenewal ? `, repõe ${weeklyRenewal.label}` : ''}`
              : `Limite semanal da subscrição Claude ${CLAUDE_WINDOW_STATUS_LABELS[weekly.status]}`
          }
        >
          <svg
            className={styles.gaugeSvg}
            viewBox="0 0 240 142"
            aria-hidden="true"
            focusable="false"
          >
            <path className={styles.track} d="M 30 120 A 90 90 0 0 1 210 120" pathLength="100" />
            <path
              className={styles.fill}
              d="M 30 120 A 90 90 0 0 1 210 120"
              pathLength="100"
              strokeDasharray={
                weekly.status === 'available' ? `${weekly.remainingPercent} 100` : '0 100'
              }
            />
          </svg>
          <div className={styles.reading} aria-live="polite">
            <strong>{weekly.status === 'available' ? `${weekly.remainingPercent}%` : '—'}</strong>
            <span>
              {weekly.status === 'available'
                ? 'restante'
                : CLAUDE_WINDOW_STATUS_LABELS[weekly.status]}
            </span>
          </div>
        </div>
        <div className={styles.details}>
          {weekly.status === 'available' && <span>{weekly.usedPercent}% usado</span>}
          {weeklyRenewal && (
            <time dateTime={weeklyRenewal.dateTime} title={weeklyRenewal.label}>
              Reset em {weekly.countdown}
            </time>
          )}
        </div>
        <p className={styles.sessionLimit}>
          <span>Sessão 5h</span>
          {session.status === 'available' ? (
            <>
              <strong>{session.remainingPercent}% restante</strong>
              <time dateTime={sessionRenewal?.dateTime} title={sessionRenewal?.label}>
                reset em {session.countdown}
              </time>
            </>
          ) : (
            <strong>{CLAUDE_WINDOW_STATUS_LABELS[session.status]}</strong>
          )}
        </p>
        <p
          className={`${styles.connectionStatus} ${CLAUDE_STATUS_TONE_CLASSES[status.tone]}`}
          role="status"
        >
          {status.label}
        </p>
      </div>
      <TokenActivity
        activity={usage?.tokenActivity}
        emptyMessage="A bridge ainda não enviou atividade local do Claude Code."
        stats={getClaudeActivityStats(usage)}
      />
    </section>
  );
});

const DashboardCodexUsageWidget = React.memo(() => (
  <div className={styles.providers} aria-label="Utilização de Codex e Claude">
    <CodexUsagePanel />
    <ClaudeUsagePanel />
  </div>
));

export default DashboardCodexUsageWidget;
