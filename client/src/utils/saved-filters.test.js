import { addSavedFilter, readSavedFilters, removeSavedFilter } from './saved-filters';

describe('saved filters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('keeps filters of different users and boards apart', () => {
    addSavedFilter('user-1', 'board-1', { name: 'Mine', userIds: ['user-1'], labelIds: [] });

    expect(readSavedFilters('user-1', 'board-1')).toEqual([
      expect.objectContaining({ name: 'Mine', userIds: ['user-1'], labelIds: [], search: '' }),
    ]);

    expect(readSavedFilters('user-2', 'board-1')).toEqual([]);
    expect(readSavedFilters('user-1', 'board-2')).toEqual([]);
  });

  test('removes a single filter and leaves the rest untouched', () => {
    addSavedFilter('user-1', 'board-1', { name: 'First', userIds: [], labelIds: ['label-1'] });

    const filters = addSavedFilter('user-1', 'board-1', {
      name: 'Second',
      userIds: [],
      labelIds: [],
      search: 'bug',
    });

    const second = filters.find(({ name }) => name === 'Second');

    expect(removeSavedFilter('user-1', 'board-1', second.id)).toEqual([
      expect.objectContaining({ name: 'First', labelIds: ['label-1'], search: '' }),
    ]);
    expect(readSavedFilters('user-1', 'board-1')).toHaveLength(1);
  });

  test('overwrites a filter saved again under the same name, keeping its place', () => {
    addSavedFilter('user-1', 'board-1', { name: 'Urgentes', userIds: [], labelIds: ['label-1'] });
    addSavedFilter('user-1', 'board-1', { name: 'Outro', userIds: [], labelIds: [] });

    const filters = addSavedFilter('user-1', 'board-1', {
      name: ' urgentes ',
      userIds: ['user-2'],
      labelIds: [],
      search: 'bug',
    });

    expect(filters).toHaveLength(2);
    expect(filters[0]).toEqual(
      expect.objectContaining({ name: ' urgentes ', userIds: ['user-2'], labelIds: [], search: 'bug' }),
    );
    expect(filters[1].name).toBe('Outro');
  });

  test('returns an empty list when the stored value is broken', () => {
    localStorage.setItem('planka_saved_filters', '{not json');

    expect(readSavedFilters('user-1', 'board-1')).toEqual([]);
  });
});
