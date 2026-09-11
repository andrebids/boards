const { expect } = require('chai');

const {
  addDays,
  differenceInDays,
  normalizeItemDates,
  parseDate,
} = require('../../utils/gantt-dates');

describe('gantt dates', () => {
  it('uses an inclusive end date', () => {
    expect(
      normalizeItemDates({
        values: {
          startDate: '2026-08-10',
          endDate: null,
          expectedDurationDays: 5,
        },
      }),
    ).to.deep.equal({
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      expectedDurationDays: 5,
    });
  });

  it('recalculates duration when the end date changes', () => {
    expect(
      normalizeItemDates({
        current: {
          startDate: '2026-08-10',
          endDate: '2026-08-14',
          expectedDurationDays: 5,
        },
        values: {
          endDate: '2026-08-17',
        },
      }),
    ).to.deep.equal({
      startDate: '2026-08-10',
      endDate: '2026-08-17',
      expectedDurationDays: 6,
    });
  });

  it('keeps unscheduled tasks without dates', () => {
    expect(
      normalizeItemDates({
        values: {
          startDate: null,
          endDate: null,
          expectedDurationDays: 2,
        },
      }),
    ).to.deep.equal({
      startDate: null,
      endDate: null,
      expectedDurationDays: 2,
    });
  });

  it('handles month and year boundaries in UTC', () => {
    expect(addDays('2026-12-31', 1)).to.equal('2027-01-01');
    expect(differenceInDays('2026-12-30', '2027-01-02')).to.equal(3);
  });

  it('rejects impossible dates', () => {
    expect(parseDate('2026-02-30')).to.equal(null);
  });

  it('schedules 15 business days inclusively and keeps the duration on a move', () => {
    const scheduled = normalizeItemDates({
      values: {
        startDate: '2026-09-07',
        endDate: null,
        expectedDurationDays: 15,
      },
    });
    expect(scheduled).to.deep.equal({
      startDate: '2026-09-07',
      endDate: '2026-09-25',
      expectedDurationDays: 15,
    });
    expect(
      normalizeItemDates({
        current: scheduled,
        values: { startDate: '2026-09-11' },
      }),
    ).to.deep.equal({
      startDate: '2026-09-11',
      endDate: '2026-10-01',
      expectedDurationDays: 15,
    });
  });

  it('moves a weekend start to Monday when scheduling by duration', () => {
    expect(
      normalizeItemDates({
        values: {
          startDate: '2026-09-12',
          endDate: null,
          expectedDurationDays: 1,
        },
      }),
    ).to.deep.equal({
      startDate: '2026-09-14',
      endDate: '2026-09-14',
      expectedDurationDays: 1,
    });
  });

  it('preserves explicit dates while counting weekdays, including legacy weekend dates', () => {
    expect(
      normalizeItemDates({
        values: { startDate: '2026-09-02', endDate: '2026-09-06' },
      }),
    ).to.deep.equal({
      startDate: '2026-09-02',
      endDate: '2026-09-06',
      expectedDurationDays: 3,
    });
    expect(
      normalizeItemDates({
        values: { startDate: '2026-09-12', endDate: '2026-09-13' },
      }).expectedDurationDays,
    ).to.equal(1);
  });

  it('rejects invalid ranges and durations before calculating business dates', () => {
    expect(() =>
      normalizeItemDates({
        values: { startDate: '2026-09-14', endDate: '2026-09-11' },
      }),
    ).to.throw('INVALID_DATE_RANGE');
    [0, -1, 1.5, Infinity].forEach((expectedDurationDays) => {
      expect(() =>
        normalizeItemDates({
          values: {
            startDate: '2026-09-11',
            endDate: null,
            expectedDurationDays,
          },
        }),
      ).to.throw('INVALID_DURATION');
    });
    expect(() =>
      normalizeItemDates({
        values: { startDate: '2026-09-11', endDate: null, expectedDurationDays: 1e100 },
      }),
    ).to.throw(RangeError);
  });
});
