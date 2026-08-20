export const initialPresentationState = {
  presentations: [],
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
      if (action.presentation?.projectId !== action.projectId) {
        return state;
      }

      return {
        ...state,
        presentations: state.presentations.some(({ id }) => id === action.presentation.id)
          ? state.presentations.map((presentation) =>
              presentation.id === action.presentation.id ? action.presentation : presentation,
            )
          : [...state.presentations, action.presentation],
      };
    default:
      return state;
  }
};
