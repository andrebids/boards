export const initialGanttState = {
  plan: null,
  items: [],
  links: [],
  users: [],
  canEdit: false,
  isLoading: false,
  error: null,
};

const removeItems = (state, itemIds) => {
  const deletedItemIds = new Set(itemIds);

  return {
    ...state,
    items: state.items.filter(({ id }) => !deletedItemIds.has(id)),
    links: state.links.filter(
      ({ sourceItemId, targetItemId }) =>
        !deletedItemIds.has(sourceItemId) && !deletedItemIds.has(targetItemId),
    ),
  };
};

export const ganttStateReducer = (state, action) => {
  switch (action.type) {
    case 'loaded':
      return { ...state, ...action.payload, isLoading: false, error: null };
    case 'loadStarted':
      return { ...state, isLoading: true, error: null };
    case 'loadFailed':
      return { ...state, isLoading: false, error: action.error };
    case 'planUpdated':
      return { ...state, plan: action.plan };
    case 'itemCreated':
      return state.items.some(({ id }) => id === action.item.id)
        ? state
        : { ...state, items: [...state.items, action.item] };
    case 'itemUpdated':
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.item.id ? action.item : item)),
      };
    case 'itemsDeleted':
      return removeItems(state, action.itemIds);
    case 'linksUpdated':
      return { ...state, links: action.links };
    case 'itemsImported': {
      const itemsById = new Map(state.items.map((item) => [item.id, item]));
      action.items.forEach((item) => itemsById.set(item.id, item));
      return { ...state, items: [...itemsById.values()] };
    }
    default:
      return state;
  }
};
