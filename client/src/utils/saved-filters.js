/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const STORAGE_KEY = 'planka_saved_filters';
const MAX_FILTERS_PER_BOARD = 20;

const getScopeKey = (userId, boardId) => `${userId}:${boardId}`;

const readStore = () => {
  try {
    const store = JSON.parse(localStorage.getItem(STORAGE_KEY));

    return store && typeof store === 'object' ? store : {};
  } catch (error) {
    return {};
  }
};

const writeStore = store => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('Erro ao guardar filtros:', error); // eslint-disable-line no-console
  }
};

const normalizeIds = ids => (Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);

const normalizeFilter = filter => ({
  id: filter.id,
  name: filter.name,
  userIds: normalizeIds(filter.userIds),
  labelIds: normalizeIds(filter.labelIds),
  search: typeof filter.search === 'string' ? filter.search : '',
});

export const readSavedFilters = (userId, boardId) => {
  if (!userId || !boardId) {
    return [];
  }

  const filters = readStore()[getScopeKey(userId, boardId)];

  if (!Array.isArray(filters)) {
    return [];
  }

  return filters.filter(filter => filter && filter.id && filter.name).map(normalizeFilter);
};

export const addSavedFilter = (userId, boardId, { name, userIds, labelIds, search }) => {
  const filters = readSavedFilters(userId, boardId);

  // Guardar com um nome que já existe substitui esse filtro, no lugar onde já estava
  const existingIndex = filters.findIndex(
    filter => filter.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const filter = normalizeFilter({
    id:
      existingIndex === -1
        ? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : filters[existingIndex].id,
    name,
    userIds,
    labelIds,
    search,
  });

  const nextFilters =
    existingIndex === -1
      ? [...filters, filter].slice(-MAX_FILTERS_PER_BOARD)
      : filters.map((item, index) => (index === existingIndex ? filter : item));

  writeStore({
    ...readStore(),
    [getScopeKey(userId, boardId)]: nextFilters,
  });

  return nextFilters;
};

export const removeSavedFilter = (userId, boardId, filterId) => {
  const nextFilters = readSavedFilters(userId, boardId).filter(filter => filter.id !== filterId);

  const store = readStore();
  const scopeKey = getScopeKey(userId, boardId);

  if (nextFilters.length === 0) {
    delete store[scopeKey];
  } else {
    store[scopeKey] = nextFilters;
  }

  writeStore(store);

  return nextFilters;
};
