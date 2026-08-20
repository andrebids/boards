import { createDefaultDashboardLayout, normalizeDashboardLayout } from './dashboardLayout';

describe('project dashboard layout', () => {
  it('creates a non-overlapping default layout for the initial widgets', () => {
    expect(createDefaultDashboardLayout()).toEqual([
      { id: 'overview', type: 'progress', x: 0, y: 0, w: 7, h: 6 },
      { id: 'status-overview', type: 'status', x: 7, y: 0, w: 3, h: 3 },
      { id: 'upcoming-top', type: 'upcoming', x: 10, y: 0, w: 2, h: 3 },
      { id: 'attention-overview', type: 'attention', x: 7, y: 3, w: 5, h: 3 },
      { id: 'upcoming-list', type: 'upcoming', x: 0, y: 6, w: 4, h: 4 },
      { id: 'attention-list', type: 'attention', x: 4, y: 6, w: 4, h: 4 },
      { id: 'status-detail', type: 'status', x: 8, y: 6, w: 4, h: 4 },
    ]);
  });

  it('rejects layouts with unknown widgets or geometry outside the grid', () => {
    expect(() =>
      normalizeDashboardLayout([{ id: 'unknown', type: 'unknown', x: 0, y: 0, w: 4, h: 3 }]),
    ).toThrow('Unknown dashboard widget');

    expect(() =>
      normalizeDashboardLayout([{ id: 'progress', type: 'progress', x: 10, y: 0, w: 4, h: 3 }]),
    ).toThrow('outside the dashboard grid');
  });

  it('accepts a configured Gantt widget and rejects an unsafe configuration', () => {
    expect(
      normalizeDashboardLayout([
        {
          id: 'gantt-alpha',
          type: 'gantt',
          x: 0,
          y: 0,
          w: 12,
          h: 7,
          config: { projectId: 'project-alpha', zoomLevel: 'week', ignored: 'value' },
        },
      ]),
    ).toEqual([
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
    ).toThrow('invalid zoom level');
  });
});
