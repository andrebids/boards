import makePresentationBoardSearchParams from './presentationNavigation';

describe('presentation board navigation', () => {
  test('opens one board through the shared board query parameter', () => {
    expect(makePresentationBoardSearchParams('board-1')).toEqual({ board: 'board-1' });
  });

  test('returns to the board overview without a board query parameter', () => {
    expect(makePresentationBoardSearchParams()).toEqual({});
  });
});
