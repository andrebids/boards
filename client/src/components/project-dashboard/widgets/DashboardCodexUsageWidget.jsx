import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import api from '../../../api';

import { buildActivityCalendar, getActivityLevel } from './codex-usage-activity';
import getCodexUsageForecast from './codex-usage-forecast';
import styles from './DashboardCodexUsageWidget.module.scss';

const USAGE_REFRESH_INTERVAL_MS = 60 * 1000;
const TOKEN_UNITS = [
  { threshold: 1e9, suffix: 'B', divisor: 1e9 },
  { threshold: 1e6, suffix: 'M', divisor: 1e6 },
  { threshold: 1e3, suffix: 'K', divisor: 1e3 },
];
const WEEKDAY_LABELS = ['D0', 'S1', 'T2', 'Q3', 'Q4', 'S5', 'S6'];

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

function TokenActivity({ activity }) {
  const calendar = buildActivityCalendar(activity?.dailyUsageBuckets);
  const summary = activity?.summary;
  const hasActivity = summary && Number.isSafeInteger(summary.lifetimeTokens);
  const calendarStyle = {
    '--calendar-columns': calendar.weeks.length,
    '--calendar-width': `${20 + calendar.weeks.length * 17}px`,
  };
  const focusedPeriodLabel = calendar.focusedMonthLabel
    ? `desde ${calendar.focusedMonthLabel}`
    : null;
  const calendarAriaLabel = `Atividade diária de tokens ${
    focusedPeriodLabel || 'nos últimos 12 meses'
  }`;

  return (
    <div className={styles.activity}>
      <div className={styles.activityHeading}>
        <span>Atividade de tokens</span>
        <small>{focusedPeriodLabel || 'últimos 12 meses'}</small>
      </div>
      {hasActivity ? (
        <>
          <div className={styles.activityStats}>
            <div>
              <span>Total</span>
              <strong>{formatTokenCount(summary.lifetimeTokens)}</strong>
            </div>
            <div>
              <span>Pico diário</span>
              <strong>{formatTokenCount(summary.peakDailyTokens)}</strong>
            </div>
            <div>
              <span>Streak</span>
              <strong>{summary.currentStreakDays}d</strong>
            </div>
            <div>
              <span>Melhor</span>
              <strong>{summary.longestStreakDays}d</strong>
            </div>
            <div>
              <span>Tarefa mais longa</span>
              <strong>{formatDuration(summary.longestRunningTurnSec)}</strong>
            </div>
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
                  <span key={label}>{label[0]}</span>
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
              {[0, 1, 2, 3, 4].map((level) => (
                <i className={`${styles.day} ${styles[`level${level}`]}`} key={level} />
              ))}
              <span>mais</span>
            </div>
          </div>
        </>
      ) : (
        <p className={styles.activityEmpty}>A bridge ainda não enviou atividade de tokens.</p>
      )}
    </div>
  );
}

TokenActivity.defaultProps = {
  activity: null,
};

TokenActivity.propTypes = {
  activity: PropTypes.shape({
    summary: PropTypes.shape({
      lifetimeTokens: PropTypes.number,
      peakDailyTokens: PropTypes.number,
      longestRunningTurnSec: PropTypes.number,
      currentStreakDays: PropTypes.number,
      longestStreakDays: PropTypes.number,
    }),
    dailyUsageBuckets: PropTypes.arrayOf(
      PropTypes.shape({
        startDate: PropTypes.string,
        tokens: PropTypes.number,
      }),
    ),
  }),
};

const DashboardCodexUsageWidget = React.memo(() => {
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
      <TokenActivity activity={usage?.tokenActivity} />
    </section>
  );
});

export default DashboardCodexUsageWidget;
