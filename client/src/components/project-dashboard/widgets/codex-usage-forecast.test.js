import getCodexUsageForecast from './codex-usage-forecast';

describe('Codex weekly usage forecast', () => {
  const baseUsage = {
    resetsAt: Date.parse('2026-08-28T12:00:00.000Z') / 1000,
    updatedAt: '2026-08-23T12:00:00.000Z',
    windowDurationMins: 7 * 24 * 60,
  };

  it('projects exhaustion before reset from the average hourly usage', () => {
    expect(getCodexUsageForecast({ ...baseUsage, usedPercent: 40 })).toEqual({
      depletesAtMs: Date.parse('2026-08-26T12:00:00.000Z'),
      isBeforeReset: true,
      usedPercentPerHour: 40 / 48,
    });
  });

  it('identifies when the projected exhaustion is after reset', () => {
    const forecast = getCodexUsageForecast({ ...baseUsage, usedPercent: 10 });

    expect(forecast.isBeforeReset).toBe(false);
    expect(forecast.depletesAtMs).toBe(Date.parse('2026-09-10T12:00:00.000Z'));
  });

  it('omits a forecast before there is measurable usage', () => {
    expect(getCodexUsageForecast({ ...baseUsage, usedPercent: 0 })).toBeNull();
  });
});
