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
      expectedDurationDays: 8,
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
});
