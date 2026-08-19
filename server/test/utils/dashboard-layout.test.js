const { expect } = require('chai');

const { normalizeDashboardLayout } = require('../../utils/dashboard-layout');

describe('dashboard layout', () => {
  it('accepts the initial dashboard widgets inside a 12-column grid', () => {
    expect(
      normalizeDashboardLayout([
        { id: 'progress', type: 'progress', x: 0, y: 0, w: 4, h: 3 },
        { id: 'status', type: 'status', x: 4, y: 0, w: 8, h: 3 },
      ]),
    ).to.deep.equal([
      { id: 'progress', type: 'progress', x: 0, y: 0, w: 4, h: 3 },
      { id: 'status', type: 'status', x: 4, y: 0, w: 8, h: 3 },
    ]);
  });

  it('rejects duplicate ids and widgets outside their permitted size', () => {
    expect(() =>
      normalizeDashboardLayout([
        { id: 'progress', type: 'progress', x: 0, y: 0, w: 4, h: 3 },
        { id: 'progress', type: 'progress', x: 4, y: 0, w: 4, h: 3 },
      ]),
    ).to.throw('unique');

    expect(() =>
      normalizeDashboardLayout([{ id: 'progress', type: 'progress', x: 0, y: 0, w: 2, h: 3 }]),
    ).to.throw('outside the dashboard grid');
  });
});
