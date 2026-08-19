import {
  getSimpleTimelineBarStyle,
  getSimpleTimelineHierarchy,
  getSimpleTimelineLayout,
  getSimpleTimelineRange,
  getSimpleTimelineMilestones,
  groupSimpleTimelineItems,
} from './simpleTimelineScale';

describe('simple Gantt timeline scale', () => {
  test('keeps stored end dates inclusive when sizing a task bar', () => {
    const range = getSimpleTimelineRange([
      { id: 'task', startDate: '2026-08-12', endDate: '2026-08-18' },
    ]);

    expect(
      getSimpleTimelineBarStyle(range, {
        startDate: '2026-08-12',
        endDate: '2026-08-18',
      }),
    ).toEqual({ left: '0%', width: '100%' });
  });

  test('groups scheduled tasks below their summary and keeps independent tasks separate', () => {
    const groups = groupSimpleTimelineItems([
      {
        id: 'summary',
        itemType: 'summary',
        task: 'Fase',
        startDate: '2026-08-10',
        endDate: '2026-08-20',
      },
      {
        id: 'later',
        itemType: 'task',
        parentId: 'summary',
        task: 'Depois',
        startDate: '2026-08-16',
        endDate: '2026-08-16',
      },
      {
        id: 'earlier',
        itemType: 'task',
        parentId: 'summary',
        task: 'Antes',
        startDate: '2026-08-12',
        endDate: '2026-08-13',
      },
      {
        id: 'independent',
        itemType: 'task',
        task: 'Sem fase',
        startDate: '2026-08-14',
        endDate: '2026-08-15',
      },
    ]);

    expect(groups).toEqual([
      { summaryId: 'summary', itemIds: ['earlier', 'later'] },
      { summaryId: null, itemIds: ['independent'] },
    ]);
  });

  test('keeps every scheduled Gantt item visible, including phase children', () => {
    const milestones = getSimpleTimelineMilestones([
      {
        id: 'phase',
        itemType: 'summary',
        task: 'Preparação',
        startDate: '2026-08-10',
        endDate: '2026-08-15',
      },
      {
        id: 'child',
        itemType: 'task',
        parentId: 'phase',
        task: 'Brief',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
      },
      {
        id: 'independent',
        itemType: 'task',
        task: 'Entrega',
        startDate: '2026-08-20',
        endDate: '2026-08-22',
      },
    ]);

    expect(milestones.map(({ id }) => id)).toEqual(['phase', 'child', 'independent']);
    expect(milestones[0].childCount).toBe(1);
  });

  test('places subtasks beneath their summary and uses extra lanes only for overlaps', () => {
    const hierarchy = getSimpleTimelineHierarchy([
      {
        id: 'phase',
        itemType: 'summary',
        task: 'Projeto',
        startDate: '2026-08-10',
        endDate: '2026-08-20',
      },
      {
        id: 'first',
        itemType: 'task',
        parentId: 'phase',
        task: 'Primeira',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
      },
      {
        id: 'overlap',
        itemType: 'task',
        parentId: 'phase',
        task: 'Sobreposta',
        startDate: '2026-08-11',
        endDate: '2026-08-13',
      },
      {
        id: 'later',
        itemType: 'task',
        parentId: 'phase',
        task: 'Seguinte',
        startDate: '2026-08-14',
        endDate: '2026-08-15',
      },
      {
        id: 'independent',
        itemType: 'task',
        task: 'Entrega',
        startDate: '2026-08-22',
        endDate: '2026-08-23',
      },
    ]);

    expect(hierarchy.primaryItems.map(({ id }) => id)).toEqual(['phase', 'independent']);
    expect(hierarchy.childGroups).toEqual([
      {
        parentId: 'phase',
        lanes: [['first', 'later'], ['overlap']],
      },
    ]);
  });

  test('uses a real date scale and separates labels that would visually overlap', () => {
    const layout = getSimpleTimelineLayout(
      [
        {
          id: 'summary',
          itemType: 'summary',
          task: 'Simu Studio',
          startDate: '2026-08-10',
          endDate: '2026-08-20',
        },
        {
          id: 'first',
          itemType: 'task',
          parentId: 'summary',
          task: 'Uma tarefa com um título suficientemente longo',
          startDate: '2026-08-10',
          endDate: '2026-08-12',
        },
        {
          id: 'second',
          itemType: 'task',
          parentId: 'summary',
          task: 'Outra tarefa',
          startDate: '2026-08-13',
          endDate: '2026-08-14',
        },
      ],
      { pixelsPerDay: 40, viewportWidth: 600, today: '2026-08-15' },
    );

    expect(layout.timelineStart).toBe('2026-08-08');
    expect(layout.timelineEnd).toBe('2026-08-22');
    expect(layout.contentWidth).toBe(720);
    expect(layout.groups[0].side).toBe('top');
    expect(layout.groups[0].lanes).toHaveLength(2);
    expect(layout.groups[0].lanes.flat().map(({ id }) => id)).toEqual(['first', 'second']);
    expect(layout.todayX).toBe(360);
  });

  test('alternates parent groups above and below the centered axis', () => {
    const layout = getSimpleTimelineLayout([
      {
        id: 'one',
        itemType: 'summary',
        task: 'Primeiro',
        startDate: '2026-08-10',
        endDate: '2026-08-12',
      },
      {
        id: 'one-task',
        itemType: 'task',
        parentId: 'one',
        task: 'Tarefa 1',
        startDate: '2026-08-10',
        endDate: '2026-08-11',
      },
      {
        id: 'two',
        itemType: 'summary',
        task: 'Segundo',
        startDate: '2026-08-13',
        endDate: '2026-08-15',
      },
      {
        id: 'two-task',
        itemType: 'task',
        parentId: 'two',
        task: 'Tarefa 2',
        startDate: '2026-08-13',
        endDate: '2026-08-14',
      },
    ]);

    expect(layout.groups.map(({ side }) => side)).toEqual(['top', 'bottom']);
    expect(layout.groups[0].lanes[0][0].y).toBeLessThan(layout.axisY);
    expect(layout.groups[1].lanes[0][0].y).toBeGreaterThan(layout.axisY);
    expect(layout.axisY).toBe(layout.canvasHeight / 2);
  });
});
