import { formatCountdown, getClaudeUsageStatus, getLimitWindowState } from './claude-usage-status';

const NOW_MS = Date.parse('2026-09-14T12:00:00.000Z');
const NOW_S = NOW_MS / 1000;

describe('Claude usage status', () => {
  it('formats short and weekly reset countdowns', () => {
    expect(formatCountdown(NOW_S + 2 * 3600 + 13 * 60, NOW_MS)).toBe('2h 13m');
    expect(formatCountdown(NOW_S + 5 * 60, NOW_MS)).toBe('5m');
    expect(formatCountdown(NOW_S + 3 * 86400 + 4 * 3600, NOW_MS)).toBe('3d 4h');
    expect(formatCountdown(NOW_S - 1, NOW_MS)).toBe('now');
  });

  it('hides percentages from windows that are missing or already reset', () => {
    expect(getLimitWindowState(null, NOW_MS)).toEqual({ status: 'unavailable' });
    expect(getLimitWindowState({ usedPercent: 80, resetsAt: NOW_S - 60 }, NOW_MS)).toEqual({
      status: 'reset',
    });
    expect(getLimitWindowState({ usedPercent: 41.6, resetsAt: NOW_S + 3600 }, NOW_MS)).toEqual({
      status: 'available',
      usedPercent: 42,
      remainingPercent: 58,
      resetsAt: NOW_S + 3600,
      countdown: '1h 0m',
    });
  });

  it('reports fresh, stale, missing and failed readings', () => {
    const usage = {
      updatedAt: '2026-09-14T11:59:00.000Z',
      rateLimits: { capturedAt: '2026-09-14T11:50:00.000Z' },
    };

    expect(getClaudeUsageStatus({ usage, nowMs: NOW_MS })).toEqual({
      tone: 'ok',
      label: '',
    });
    expect(
      getClaudeUsageStatus({
        usage: { ...usage, rateLimits: { capturedAt: '2026-09-14T09:00:00.000Z' } },
        nowMs: NOW_MS,
      }),
    ).toEqual({ tone: 'warning', label: '' });
    expect(
      getClaudeUsageStatus({ usage: { ...usage, rateLimits: null }, nowMs: NOW_MS }).label,
    ).toBe('Limits not yet read by Claude Code');
    expect(
      getClaudeUsageStatus({
        usage: { ...usage, updatedAt: '2026-09-13T12:00:00.000Z' },
        nowMs: NOW_MS,
      }).label,
    ).toBe('No bridge update · last received 24h ago');
    expect(getClaudeUsageStatus({ usage: null, nowMs: NOW_MS }).label).toBe('No bridge data yet');
    expect(getClaudeUsageStatus({ usage, hasLoadError: true, nowMs: NOW_MS })).toEqual({
      tone: 'error',
      label: 'Update failed · last received 1 min ago',
    });
  });
});
