import getCodexUsageForecast, { getClaudeUsageForecast } from './codex-usage-forecast';

describe('Codex weekly usage forecast', () => {
  const baseUsage = {
    resetsAt: Date.parse('2026-08-28T08:00:00') / 1000,
    updatedAt: '2026-08-24T08:00:00',
    windowDurationMins: 7 * 24 * 60,
  };

  it('counts eight working hours on Friday and skips the weekend in the projection', () => {
    expect(getCodexUsageForecast({ ...baseUsage, usedPercent: 40 })).toEqual({
      depletesAtMs: Date.parse('2026-08-25T12:00:00'),
      isBeforeReset: true,
      usedPercentPerHour: 40 / 8,
    });
  });

  it('shows enough quota until reset without projecting into the next window', () => {
    const forecast = getCodexUsageForecast({ ...baseUsage, usedPercent: 10 });

    expect(forecast.isBeforeReset).toBe(false);
    expect(forecast.depletesAtMs).toBeNull();
  });

  it('excludes lunch and nights from both the average and the projection', () => {
    const forecast = getCodexUsageForecast({
      ...baseUsage,
      updatedAt: '2026-08-24T12:30:00',
      usedPercent: 50,
    });

    expect(forecast.usedPercentPerHour).toBe(50 / 12);
    expect(forecast.depletesAtMs).toBe(Date.parse('2026-08-25T17:00:00'));
  });

  it('keeps the same rate and projection outside working hours', () => {
    const friday = getCodexUsageForecast({
      ...baseUsage,
      updatedAt: '2026-08-21T17:00:00',
      usedPercent: 40,
    });
    expect(getCodexUsageForecast({ ...baseUsage, usedPercent: 40 })).toEqual(friday);
  });

  it('treats depletion exactly at reset as lasting until reset', () => {
    const forecast = getCodexUsageForecast({
      ...baseUsage,
      resetsAt: Date.parse('2026-08-28T16:00:00') / 1000,
      updatedAt: '2026-08-24T16:00:00',
      usedPercent: 20,
    });
    expect(forecast.depletesAtMs).toBe(Date.parse('2026-08-28T16:00:00'));
    expect(forecast.isBeforeReset).toBe(false);
  });

  it('reports an already exhausted quota immediately', () => {
    const forecast = getCodexUsageForecast({ ...baseUsage, usedPercent: 100 });
    expect(forecast.depletesAtMs).toBe(Date.parse(baseUsage.updatedAt));
    expect(forecast.isBeforeReset).toBe(true);
  });

  it('omits a forecast without elapsed working hours or with an expired window', () => {
    expect(
      getCodexUsageForecast({
        ...baseUsage,
        resetsAt: Date.parse('2026-08-31T08:00:00') / 1000,
        usedPercent: 10,
      }),
    ).toBeNull();
    expect(
      getCodexUsageForecast({
        ...baseUsage,
        updatedAt: '2026-08-28T08:00:00',
        usedPercent: 10,
      }),
    ).toBeNull();
  });

  it('omits a forecast before there is measurable usage', () => {
    expect(getCodexUsageForecast({ ...baseUsage, usedPercent: 0 })).toBeNull();
  });

  it('uses the actual Claude reading time instead of the bridge delivery time', () => {
    const usage = {
      updatedAt: '2026-08-24T16:00:00',
      rateLimits: {
        capturedAt: baseUsage.updatedAt,
        sevenDay: { usedPercent: 40, resetsAt: baseUsage.resetsAt },
      },
    };
    expect(getClaudeUsageForecast(usage, Date.parse(usage.updatedAt))).toEqual(
      getCodexUsageForecast({ ...baseUsage, usedPercent: 40 }),
    );
    expect(getClaudeUsageForecast(usage, baseUsage.resetsAt * 1000)).toBeNull();
  });

  it('omits the Claude forecast without a weekly reading and its capture time', () => {
    const nowMs = Date.parse(baseUsage.updatedAt);
    expect(getClaudeUsageForecast(null, nowMs)).toBeNull();
    expect(
      getClaudeUsageForecast(
        {
          updatedAt: baseUsage.updatedAt,
          rateLimits: { sevenDay: { usedPercent: 40, resetsAt: baseUsage.resetsAt } },
        },
        nowMs,
      ),
    ).toBeNull();
  });
});
