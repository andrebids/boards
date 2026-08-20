import {
  createDefaultDashboardLayout,
  fromGridStackDashboardWidgets,
  mergeDashboardLayoutGeometry,
  normalizeDashboardLayout,
  placeDashboardWidget,
  toGridStackDashboardWidget,
} from './dashboardLayout';

describe('project dashboard layout', () => {
  it('creates a non-overlapping default layout for the initial widgets', () => {
    const layout = createDefaultDashboardLayout();

    expect(layout).toEqual([
      { id: 'overview', type: 'progress', x: 0, y: 0, w: 6, h: 6 },
      { id: 'status-overview', type: 'status', x: 6, y: 0, w: 3, h: 3 },
      { id: 'upcoming-top', type: 'upcoming', x: 9, y: 0, w: 3, h: 3 },
      { id: 'attention-overview', type: 'attention', x: 6, y: 3, w: 6, h: 3 },
      { id: 'upcoming-list', type: 'upcoming', x: 0, y: 6, w: 4, h: 4 },
      { id: 'attention-list', type: 'attention', x: 4, y: 6, w: 4, h: 4 },
      { id: 'status-detail', type: 'status', x: 8, y: 6, w: 4, h: 4 },
    ]);
    expect(normalizeDashboardLayout(layout)).toEqual(layout);
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

  it('merges the complete GridStack serialization without losing widget configuration', () => {
    expect(
      mergeDashboardLayoutGeometry(
        [
          {
            id: 'gantt-alpha',
            type: 'gantt',
            x: 0,
            y: 0,
            w: 12,
            h: 7,
            config: { projectId: 'project-alpha', zoomLevel: 'week' },
          },
          { id: 'overview', type: 'progress', x: 0, y: 7, w: 7, h: 6 },
        ],
        [
          { id: 'overview', x: 5, y: 0, w: 7, h: 6 },
          { id: 'gantt-alpha', x: 0, y: 6, w: 12, h: 7 },
        ],
      ),
    ).toEqual([
      { id: 'overview', type: 'progress', x: 5, y: 0, w: 7, h: 6 },
      {
        id: 'gantt-alpha',
        type: 'gantt',
        x: 0,
        y: 6,
        w: 12,
        h: 7,
        config: { projectId: 'project-alpha', zoomLevel: 'week' },
      },
    ]);
  });

  it('round-trips GridStack widget props so added widgets are included in persistence', () => {
    const layout = [
      { id: 'overview', type: 'progress', x: 0, y: 0, w: 7, h: 6 },
      {
        id: 'gantt-alpha',
        type: 'gantt',
        x: 0,
        y: 6,
        w: 12,
        h: 7,
        config: { projectId: 'project-alpha', zoomLevel: 'week' },
      },
    ];

    const serialized = layout.map(toGridStackDashboardWidget).map((widget, index) => ({
      ...widget,
      x: index === 0 ? 5 : 0,
      y: index === 0 ? 0 : 6,
    }));

    expect(fromGridStackDashboardWidgets(serialized)).toEqual([
      { id: 'overview', type: 'progress', x: 5, y: 0, w: 7, h: 6 },
      {
        id: 'gantt-alpha',
        type: 'gantt',
        x: 0,
        y: 6,
        w: 12,
        h: 7,
        config: { projectId: 'project-alpha', zoomLevel: 'week' },
      },
    ]);
  });

  it('restores dimensions omitted by GridStack when they equal minimum constraints', () => {
    expect(
      fromGridStackDashboardWidgets([
        {
          id: 'status-minimum',
          x: 0,
          y: 0,
          minW: 3,
          minH: 3,
          props: {
            widget: { id: 'status-minimum', type: 'status', x: 0, y: 0, w: 4, h: 4 },
          },
        },
      ]),
    ).toEqual([{ id: 'status-minimum', type: 'status', x: 0, y: 0, w: 3, h: 3 }]);
  });

  it('places a widget in the first available grid area without overlap', () => {
    const layout = [{ id: 'top', type: 'progress', x: 0, y: 0, w: 12, h: 3 }];

    expect(placeDashboardWidget(layout, { id: 'next', type: 'status', w: 3, h: 3 })).toEqual({
      id: 'next',
      type: 'status',
      w: 3,
      h: 3,
      x: 0,
      y: 3,
    });
  });
});
