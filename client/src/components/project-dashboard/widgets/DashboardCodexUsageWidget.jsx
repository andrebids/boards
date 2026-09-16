import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import api from '../../../api';

import {
  ACTIVITY_LEVEL_COUNT,
  buildActivityCalendar,
  getActivityCalendarWeeks,
  getActivityLevel,
} from './codex-usage-activity';
import { getClaudeUsageStatus, getLimitWindowState } from './claude-usage-status';
import getCodexUsageForecast, { getClaudeUsageForecast } from './codex-usage-forecast';
import styles from './DashboardCodexUsageWidget.module.scss';

const USAGE_REFRESH_INTERVAL_MS = 60 * 1000;
const TOKEN_UNITS = [
  { threshold: 1e9, suffix: 'B', divisor: 1e9 },
  { threshold: 1e6, suffix: 'M', divisor: 1e6 },
  { threshold: 1e3, suffix: 'K', divisor: 1e3 },
];
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
    timeLabel: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(renewalDate),
    label: new Intl.DateTimeFormat('en-GB', {
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
    return 'now';
  }

  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  return `${days}d ${hours}h`;
};

const formatTokenCount = (tokens) => {
  if (!Number.isSafeInteger(tokens) || tokens < 0) {
    return 'n/a';
  }

  const unit = TOKEN_UNITS.find(({ threshold }) => tokens >= threshold);
  const value = unit ? tokens / unit.divisor : tokens;

  return `${new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: unit ? 2 : 0,
  }).format(value)}${unit ? unit.suffix : ''}`;
};

const formatDuration = (seconds) => {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    return 'n/a';
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
    '--calendar-width': `${calendar.weeks.length * 24}px`,
  };
  const focusedPeriodLabel = calendar.focusedMonthLabel
    ? `since ${calendar.focusedMonthLabel}`
    : null;
  const calendarAriaLabel = `Daily token activity ${
    focusedPeriodLabel || 'over the last 12 months'
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
              {calendar.monthMarks.map(({ index, label }) => (
                <span key={`${index}-${label}`} style={{ gridColumn: index + 1 }}>
                  {label}
                </span>
              ))}
            </div>
            <div className={styles.calendarGrid} aria-label={calendarAriaLabel}>
              {calendar.weeks.map((week) => (
                <div className={styles.week} key={week[0].dateKey}>
                  {week.map(({ dateKey, tokens }) => {
                    const level = getActivityLevel(tokens, calendar.peak);
                    return (
                      <button
                        type="button"
                        className={`${styles.day} ${styles[`level${level}`]}`}
                        key={dateKey}
                        title={`${dateKey}: ${tokens.toLocaleString('en-GB')} tokens`}
                        aria-label={`${dateKey}: ${tokens.toLocaleString('en-GB')} tokens`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.legend} aria-hidden="true">
              <span className={styles.rangeLabel}>{calendar.rangeLabel}</span>
              <span className={styles.legendScale}>
                <span>less</span>
                {Array.from({ length: ACTIVITY_LEVEL_COUNT + 1 }, (_, level) => level).map(
                  (level) => (
                    <i className={`${styles.day} ${styles[`level${level}`]}`} key={level} />
                  ),
                )}
                <span>more</span>
              </span>
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
  emptyMessage: 'No token activity received from the bridge yet.',
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
    { label: 'Daily peak', value: formatTokenCount(summary.peakDailyTokens) },
    { label: 'Streak', value: `${summary.currentStreakDays}d` },
    { label: 'Best streak', value: `${summary.longestStreakDays}d` },
    {
      label: 'Longest task',
      value: formatDuration(summary.longestRunningTurnSec),
    },
  ];
};

function UsageForecast({ forecast }) {
  if (!forecast) {
    return null;
  }

  const depletion = forecast.isBeforeReset
    ? formatRenewal(Math.round(forecast.depletesAtMs / 1000))
    : null;
  const depletionLabel = depletion
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit' }).format(
        new Date(depletion.dateTime),
      )
    : null;
  const rate = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(
    forecast.usedPercentPerHour,
  );

  return (
    <p
      className={styles.forecast}
      title="Estimate based on average usage since the start of the window."
      aria-label={`${rate}% per hour, ${
        depletion ? `runs out around ${depletionLabel}` : 'lasts until reset'
      }`}
    >
      {rate}%/h
      <br />
      {depletion ? (
        <time dateTime={depletion.dateTime}>Runs out ~{depletionLabel}</time>
      ) : (
        'Lasts until reset'
      )}
    </p>
  );
}

UsageForecast.defaultProps = { forecast: null };
UsageForecast.propTypes = {
  forecast: PropTypes.shape({
    isBeforeReset: PropTypes.bool.isRequired,
    depletesAtMs: PropTypes.number,
    usedPercentPerHour: PropTypes.number.isRequired,
  }),
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
  const displayedPercent = hasUsage ? `${remainingPercent}%` : 'n/a';
  const renewal = formatRenewal(usage?.resetsAt);
  const resetCountdown = formatResetCountdown(usage?.resetsAt, nowMs);
  const forecast = getCodexUsageForecast(usage);

  return (
    <section className={styles.wrapper} aria-label="Codex weekly usage">
      <div className={styles.weekly}>
        <h2 className={styles.providerName}>Codex</h2>
        <div
          className={styles.gauge}
          role="status"
          aria-label={
            hasUsage
              ? `Codex weekly usage: ${remainingPercent}% remaining, ${usedPercent}% used${
                  renewal ? `, resets ${renewal.label}` : ''
                }`
              : 'Weekly usage unavailable'
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
            {hasUsage && <span>remaining</span>}
          </div>
        </div>
        <div className={styles.details}>
          {hasUsage && <span>{usedPercent}% used</span>}
          {renewal && resetCountdown && (
            <time dateTime={renewal.dateTime} title={renewal.label}>
              Reset in {resetCountdown}
            </time>
          )}
        </div>
        <UsageForecast forecast={forecast} />
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
    { label: 'Local total', value: formatTokenCount(summary.totalTokens) },
    { label: 'Daily peak', value: formatTokenCount(summary.peakDailyTokens) },
    { label: 'Streak', value: `${summary.currentStreakDays}d` },
    { label: 'Best streak', value: `${summary.longestStreakDays}d` },
  ];
};

const CLAUDE_WINDOW_STATUS_LABELS = {
  reset: 'reset',
  unavailable: 'unavailable',
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
  const forecast = getClaudeUsageForecast(usage, nowMs);

  return (
    <section className={`${styles.wrapper} ${styles.claude}`} aria-label="Claude usage">
      <div className={styles.weekly}>
        <h2 className={styles.providerName}>Claude</h2>
        <div
          className={styles.gauge}
          role="status"
          aria-label={
            weekly.status === 'available'
              ? `Claude weekly subscription limit: ${weekly.remainingPercent}% remaining, ${
                  weekly.usedPercent
                }% used${weeklyRenewal ? `, resets ${weeklyRenewal.label}` : ''}`
              : `Claude weekly subscription limit ${CLAUDE_WINDOW_STATUS_LABELS[weekly.status]}`
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
            <strong>{weekly.status === 'available' ? `${weekly.remainingPercent}%` : 'n/a'}</strong>
            <span>
              {weekly.status === 'available'
                ? 'remaining'
                : CLAUDE_WINDOW_STATUS_LABELS[weekly.status]}
            </span>
          </div>
        </div>
        <div className={styles.details}>
          {weekly.status === 'available' && <span>{weekly.usedPercent}% used</span>}
          {weeklyRenewal && (
            <time dateTime={weeklyRenewal.dateTime} title={weeklyRenewal.label}>
              Reset in {weekly.countdown}
            </time>
          )}
        </div>
        <UsageForecast forecast={forecast} />
        <p className={styles.sessionLimit}>
          <span>5h session</span>
          {session.status === 'available' ? (
            <>
              <strong>{session.remainingPercent}% remaining</strong>
              <time dateTime={sessionRenewal?.dateTime} title={sessionRenewal?.label}>
                reset at {sessionRenewal?.timeLabel}
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
        emptyMessage="No local Claude Code activity received from the bridge yet."
        stats={getClaudeActivityStats(usage)}
      />
    </section>
  );
});

const DashboardCodexUsageWidget = React.memo(() => {
  const providersRef = useRef(null);

  useEffect(() => {
    const providers = providersRef.current;
    if (!providers || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    let frame;
    const alignSections = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        ['weekly', 'activityStats'].forEach((section) => {
          const heights = [...providers.querySelectorAll(`.${styles[section]}`)].map((element) => {
            const { marginTop, marginBottom } = window.getComputedStyle(element);
            return (
              element.getBoundingClientRect().height +
              parseFloat(marginTop) +
              parseFloat(marginBottom)
            );
          });
          providers.style.setProperty(`--${section}-height`, `${Math.max(0, ...heights)}px`);
        });
      });
    };
    const resizeObserver = new ResizeObserver(alignSections);
    const observeSections = () => {
      resizeObserver.disconnect();
      providers
        .querySelectorAll(`.${styles.weekly}, .${styles.activityStats}`)
        .forEach((element) => {
          resizeObserver.observe(element);
        });
      alignSections();
    };
    // Readings arrive independently and can add or remove the statistics block.
    const mutationObserver = new MutationObserver(observeSections);
    mutationObserver.observe(providers, { childList: true, subtree: true });
    observeSections();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.providers} ref={providersRef} aria-label="Codex and Claude usage">
      <CodexUsagePanel />
      <ClaudeUsagePanel />
    </div>
  );
});

export default DashboardCodexUsageWidget;
