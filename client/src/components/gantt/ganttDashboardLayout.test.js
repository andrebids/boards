import {
  filterDashboardGanttLinks,
  getDashboardGanttCellWidth,
  getDashboardGanttFontSize,
  getDashboardGanttPageSize,
  getDashboardGanttRange,
  getDashboardGanttRowHeight,
  paginateDashboardGanttItems,
} from './ganttDashboardLayout';

describe('dashboard gantt layout', () => {
  it('keeps rows readable on a TV and lets the widget paginate the overflow', () => {
    expect(getDashboardGanttRowHeight(812, 19)).toBe(38);
    expect(getDashboardGanttRowHeight(812, 6)).toBe(44);
    expect(getDashboardGanttPageSize(812)).toBe(19);
    expect(getDashboardGanttPageSize(120)).toBe(4);
    expect(getDashboardGanttFontSize(38)).toBe(16);
    expect(getDashboardGanttFontSize(28)).toBe(13);
    expect(getDashboardGanttFontSize(90)).toBe(17);
  });

  it('sizes cells so about seven weeks fit the dashboard chart', () => {
    expect(getDashboardGanttCellWidth(1219, 'week', 126)).toBe(174);
    expect(getDashboardGanttCellWidth(1219, 'day', 36)).toBe(24);
    expect(getDashboardGanttCellWidth(0, 'week', 126)).toBe(126);
    expect(getDashboardGanttCellWidth(1219, 'unknown', 126)).toBe(126);
  });

  it('opens the chart a week before today, seven weeks wide, and stretches to fit tasks', () => {
    const now = new Date(2026, 8, 14, 15, 0);

    expect(getDashboardGanttRange([], now)).toEqual({
      start: new Date(2026, 8, 7),
      end: new Date(2026, 9, 26),
    });
    expect(
      getDashboardGanttRange(
        [
          { start: new Date(2026, 7, 5), end: new Date(2026, 7, 20) },
          { start: new Date(2026, 8, 20), end: new Date(2026, 11, 3) },
        ],
        now,
      ),
    ).toEqual({ start: new Date(2026, 7, 3), end: new Date(2026, 11, 7) });
  });

  it('paginates depth first and repeats ancestors when a page starts inside a subtree', () => {
    const items = [
      { id: 'group', parentId: null },
      { id: 'a', parentId: 'group' },
      { id: 'b', parentId: 'group' },
      { id: 'c', parentId: 'group' },
      { id: 'other', parentId: null },
      { id: 'd', parentId: 'other' },
    ];

    const pages = paginateDashboardGanttItems(items, 3).map((page) => page.map(({ id }) => id));

    expect(pages).toEqual([
      ['group', 'a', 'b'],
      ['group', 'c', 'other'],
      ['other', 'd'],
    ]);
  });

  it('never produces an empty page and tolerates tiny page sizes', () => {
    const items = [
      { id: 'root', parentId: null },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
    ];

    expect(paginateDashboardGanttItems(items, 1).map((page) => page.map(({ id }) => id))).toEqual([
      ['root'],
      ['child'],
      ['grandchild'],
    ]);
    expect(paginateDashboardGanttItems([], 5)).toEqual([]);
  });

  it('keeps only links whose ends are both on the page', () => {
    const links = [
      { id: 'l1', sourceItemId: 'a', targetItemId: 'b' },
      { id: 'l2', sourceItemId: 'a', targetItemId: 'z' },
    ];

    expect(filterDashboardGanttLinks(links, [{ id: 'a' }, { id: 'b' }])).toEqual([links[0]]);
  });
});
