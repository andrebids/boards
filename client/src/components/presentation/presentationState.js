export const initialPresentationState = {
  presentation: null,
  canEdit: false,
  isLoading: false,
  error: null,
};

export const presentationStateReducer = (state, action) => {
  switch (action.type) {
    case 'loaded':
      return { ...state, ...action.payload, isLoading: false, error: null };
    case 'loadStarted':
      return { ...state, isLoading: true, error: null };
    case 'loadFailed':
      return { ...state, isLoading: false, error: action.error };
    case 'presentationUpdated':
      return action.presentation?.projectId === action.projectId
        ? { ...state, presentation: action.presentation }
        : state;
    default:
      return state;
  }
};
