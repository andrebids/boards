import { initialPresentationState, presentationStateReducer } from './presentationState';

describe('presentationStateReducer', () => {
  test('loads the independent presentations created for the project boards', () => {
    const presentations = [
      { id: 'presentation-1', projectId: 'project-1', boardId: 'board-1', isEnabled: true },
      { id: 'presentation-2', projectId: 'project-1', boardId: 'board-2', isEnabled: false },
    ];

    expect(
      presentationStateReducer(initialPresentationState, {
        type: 'loaded',
        payload: { presentations, canEdit: true },
      }),
    ).toMatchObject({
      presentations,
      canEdit: true,
      isLoading: false,
      error: null,
    });
  });

  test('updates one board presentation without replacing the remaining project presentations', () => {
    const state = {
      ...initialPresentationState,
      presentations: [
        { id: 'presentation-1', projectId: 'project-1', boardId: 'board-1', isEnabled: true },
        { id: 'presentation-2', projectId: 'project-1', boardId: 'board-2', isEnabled: true },
      ],
    };

    expect(
      presentationStateReducer(state, {
        type: 'presentationUpdated',
        presentation: {
          id: 'presentation-2',
          projectId: 'project-1',
          boardId: 'board-2',
          isEnabled: false,
        },
        projectId: 'project-1',
      }),
    ).toMatchObject({
      presentations: [
        { id: 'presentation-1', boardId: 'board-1', isEnabled: true },
        { id: 'presentation-2', boardId: 'board-2', isEnabled: false },
      ],
    });
  });

  test('ignores presentation updates from another project', () => {
    const state = {
      ...initialPresentationState,
      presentations: [
        { id: 'presentation-1', projectId: 'project-1', boardId: 'board-1', isEnabled: true },
      ],
    };

    expect(
      presentationStateReducer(state, {
        type: 'presentationUpdated',
        presentation: {
          id: 'presentation-2',
          projectId: 'project-2',
          boardId: 'board-2',
          isEnabled: true,
        },
        projectId: 'project-1',
      }),
    ).toBe(state);
  });
});
