import { initialPresentationState, presentationStateReducer } from './presentationState';

describe('presentationStateReducer', () => {
  test('keeps the presentation disabled until the project manager activates it', () => {
    const presentation = {
      id: 'presentation-1',
      projectId: 'project-1',
      isEnabled: false,
    };

    expect(
      presentationStateReducer(initialPresentationState, {
        type: 'loaded',
        payload: { presentation, canEdit: true },
      }),
    ).toMatchObject({
      presentation,
      canEdit: true,
      isLoading: false,
      error: null,
    });
  });

  test('applies a socket update only to the active project presentation', () => {
    const state = {
      ...initialPresentationState,
      presentation: { id: 'presentation-1', projectId: 'project-1', isEnabled: true },
    };

    expect(
      presentationStateReducer(state, {
        type: 'presentationUpdated',
        presentation: { id: 'presentation-2', projectId: 'project-2', isEnabled: false },
        projectId: 'project-1',
      }),
    ).toBe(state);
  });
});
