import getEnabledPresentationForBoard, {
  getPresentationBoardTileMode,
} from './presentationBoardTileState';

describe('getEnabledPresentationForBoard', () => {
  const presentations = [
    { id: 'presentation-1', boardId: 'board-1', isEnabled: true },
    { id: 'presentation-2', boardId: 'board-2', isEnabled: false },
  ];

  test('returns the enabled presentation for the requested board', () => {
    expect(getEnabledPresentationForBoard(presentations, 'board-1')).toEqual(presentations[0]);
  });

  test('does not return a disabled presentation', () => {
    expect(getEnabledPresentationForBoard(presentations, 'board-2')).toBeNull();
  });

  test('does not return a presentation for another board', () => {
    expect(getEnabledPresentationForBoard(presentations, 'board-3')).toBeNull();
  });

  test('offers creation only to an editor when the board has no presentation', () => {
    expect(getPresentationBoardTileMode(presentations, 'board-3', true)).toBe('create');
    expect(getPresentationBoardTileMode(presentations, 'board-3', false)).toBeNull();
  });
});
