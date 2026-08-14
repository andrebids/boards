import { ganttStateReducer, initialGanttState } from './ganttState';

describe('ganttStateReducer', () => {
  test('removes deleted items and every related dependency', () => {
    const state = {
      ...initialGanttState,
      items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      links: [
        { id: 'ab', sourceItemId: 'a', targetItemId: 'b' },
        { id: 'bc', sourceItemId: 'b', targetItemId: 'c' },
      ],
    };

    expect(ganttStateReducer(state, { type: 'itemsDeleted', itemIds: ['b'] })).toEqual({
      ...state,
      items: [{ id: 'a' }, { id: 'c' }],
      links: [],
    });
  });

  test('merges imported items without duplicating an existing item', () => {
    const state = { ...initialGanttState, items: [{ id: 'a', task: 'Old' }] };

    expect(
      ganttStateReducer(state, {
        type: 'itemsImported',
        items: [{ id: 'a', task: 'New' }, { id: 'b', task: 'Added' }],
      }),
    ).toMatchObject({
      items: [{ id: 'a', task: 'New' }, { id: 'b', task: 'Added' }],
    });
  });
});
