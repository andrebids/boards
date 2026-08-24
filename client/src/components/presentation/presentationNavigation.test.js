import makePresentationBoardSearchParams, {
  makePathWithPresentationBoard,
} from './presentationNavigation';

describe('presentation board navigation', () => {
  test('opens one board through the shared board query parameter', () => {
    expect(makePresentationBoardSearchParams('board-1')).toEqual({ board: 'board-1' });
  });

  test('returns to the board overview without a board query parameter', () => {
    expect(makePresentationBoardSearchParams()).toEqual({});
  });

  test('keeps the selected presentation board while navigating to another project tab', () => {
    expect(makePathWithPresentationBoard('/projects/project-1/gantt', 'board-1')).toBe(
      '/projects/project-1/gantt?board=board-1',
    );
  });
});
