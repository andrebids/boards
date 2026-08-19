import { createDefaultDashboardLayout, normalizeDashboardLayout } from './dashboardLayout';

describe('project dashboard layout', () => {
  it('creates a non-overlapping default layout for the initial widgets', () => {
    expect(createDefaultDashboardLayout()).toEqual([
      { id: 'progress', type: 'progress', x: 0, y: 0, w: 4, h: 3 },
      { id: 'status', type: 'status', x: 4, y: 0, w: 8, h: 3 },
      { id: 'upcoming', type: 'upcoming', x: 0, y: 3, w: 6, h: 5 },
      { id: 'attention', type: 'attention', x: 6, y: 3, w: 6, h: 5 },
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
});
