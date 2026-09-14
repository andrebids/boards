import {
  filterDashboardGanttLinks,
  getDashboardGanttFontSize,
  getDashboardGanttPageSize,
  getDashboardGanttRowHeight,
  paginateDashboardGanttItems,
} from './ganttDashboardLayout';

describe('dashboard gantt layout', () => {
  it('keeps rows readable on a TV and lets the widget paginate the overflow', () => {
    expect(getDashboardGanttRowHeight(812, 19)).toBe(40);
    expect(getDashboardGanttRowHeight(812, 6)).toBe(64);
    expect(getDashboardGanttPageSize(812)).toBe(13);
    expect(getDashboardGanttPageSize(120)).toBe(4);
    expect(getDashboardGanttFontSize(52)).toBe(22);
    expect(getDashboardGanttFontSize(30)).toBe(16);
    expect(getDashboardGanttFontSize(90)).toBe(24);
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
