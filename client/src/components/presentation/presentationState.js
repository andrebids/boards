export const initialPresentationState = {
  presentations: [],
  selectedBoardId: null,
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
    case 'presentationBoardSelected':
      return { ...state, selectedBoardId: action.boardId || null };
    case 'presentationSessionUpdated':
      return {
        ...state,
        presentations: state.presentations.map((presentation) =>
          presentation.id === action.presentationId
            ? {
                ...presentation,
                cryptpadSessionKey: action.key,
                cryptpadKeyVersion: action.keyVersion,
              }
            : presentation,
        ),
      };
    default:
      return state;
  }
};
