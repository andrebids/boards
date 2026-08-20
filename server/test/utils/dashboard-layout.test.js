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

  it('accepts the same default geometry rendered by the dashboard editor', () => {
    expect(
      normalizeDashboardLayout([
        { id: 'overview', type: 'progress', x: 0, y: 0, w: 6, h: 6 },
        { id: 'status-overview', type: 'status', x: 6, y: 0, w: 3, h: 3 },
        { id: 'upcoming-top', type: 'upcoming', x: 9, y: 0, w: 3, h: 3 },
        { id: 'attention-overview', type: 'attention', x: 6, y: 3, w: 6, h: 3 },
        { id: 'upcoming-list', type: 'upcoming', x: 0, y: 6, w: 4, h: 4 },
        { id: 'attention-list', type: 'attention', x: 4, y: 6, w: 4, h: 4 },
        { id: 'status-detail', type: 'status', x: 8, y: 6, w: 4, h: 4 },
      ]),
    ).to.have.length(7);
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

  it('keeps only the permitted configuration for a Gantt widget', () => {
    expect(
      normalizeDashboardLayout([
        {
          id: 'gantt-alpha',
          type: 'gantt',
          x: 0,
          y: 0,
          w: 12,
          h: 7,
          config: { projectId: 'project-alpha', zoomLevel: 'week', ignored: true },
        },
      ]),
    ).to.deep.equal([
      {
        id: 'gantt-alpha',
        type: 'gantt',
        x: 0,
        y: 0,
        w: 12,
        h: 7,
        config: { projectId: 'project-alpha', zoomLevel: 'week' },
      },
    ]);

    expect(() =>
      normalizeDashboardLayout([
        {
          id: 'gantt-alpha',
          type: 'gantt',
          x: 0,
          y: 0,
          w: 12,
          h: 7,
          config: { projectId: 'project-alpha', zoomLevel: 'year' },
        },
      ]),
    ).to.throw('invalid zoom level');
  });
});
