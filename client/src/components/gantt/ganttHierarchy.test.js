import { getDescendantIds, isValidParent } from './ganttHierarchy';

const server = require('../../../../server/utils/gantt-hierarchy');

test('parent choices agree with the server for every move in a three-level tree', () => {
  const items = [
    { id: 'group', itemType: 'summary', ganttPlanId: 'p' },
    { id: 'parent', itemType: 'task', ganttPlanId: 'p', parentId: 'group' },
    { id: 'child', itemType: 'task', ganttPlanId: 'p', parentId: 'parent' },
    { id: 'other', itemType: 'task', ganttPlanId: 'p' },
    { id: 'foreign', itemType: 'task', ganttPlanId: 'q' },
  ];
  [...items, { id: 'new', itemType: 'task', ganttPlanId: 'p' }].forEach((item) => {
    [null, 'missing', ...items.map(({ id }) => id)].forEach((parentId) => {
      expect(isValidParent(items, item, parentId)).toBe(
        server.isValidParent(items, item, parentId),
      );
    });
    expect(getDescendantIds(items, item.id)).toEqual(server.getDescendantIds(items, item.id));
  });
});
