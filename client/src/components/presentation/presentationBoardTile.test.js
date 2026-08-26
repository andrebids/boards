import getEnabledPresentationForBoard, {
  getPresentationBoardTileMode,
  getPresentationBoardTilePreview,
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

  test('uses a preview only when it belongs to the current PPTX version', () => {
    const presentation = {
      documentData: {
        filename: 'presentation-new.pptx',
        preview: {
          status: 'ready',
          sourceFilename: 'presentation-new.pptx',
          filename: 'preview-presentation-new.jpg',
        },
      },
    };

    expect(getPresentationBoardTilePreview(presentation)).toEqual(
      expect.objectContaining({ filename: 'preview-presentation-new.jpg' }),
    );
  });

  test('does not show a stale or incomplete preview', () => {
    expect(
      getPresentationBoardTilePreview({
        documentData: {
          filename: 'presentation-new.pptx',
          preview: {
            status: 'ready',
            sourceFilename: 'presentation-old.pptx',
            filename: 'preview-presentation-old.jpg',
          },
        },
      }),
    ).toBeNull();

    expect(
      getPresentationBoardTilePreview({
        documentData: {
          filename: 'presentation-new.pptx',
          preview: { status: 'pending', sourceFilename: 'presentation-new.pptx' },
        },
      }),
    ).toBeNull();
  });
});
