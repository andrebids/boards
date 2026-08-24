import {
  getCardIdFromFileDropTarget,
  getFileDropTarget,
  NEW_CARD_FILE_DROP_TARGET,
} from './file-drop-target';

describe('file drop target helpers', () => {
  test('prefers the nearest card target over the list target', () => {
    const cardTarget = { dataset: { fileDropTarget: 'card:card-1' } };
    const target = {
      closest: jest.fn().mockReturnValue(cardTarget),
    };

    expect(getFileDropTarget(target)).toBe('card:card-1');
    expect(target.closest).toHaveBeenCalledWith('[data-file-drop-target]');
  });

  test('uses the new-card target outside existing cards', () => {
    const target = {
      closest: jest.fn().mockReturnValue({
        dataset: { fileDropTarget: NEW_CARD_FILE_DROP_TARGET },
      }),
    };

    expect(getFileDropTarget(target)).toBe(NEW_CARD_FILE_DROP_TARGET);
  });

  test('returns no target for elements outside a file drop zone', () => {
    expect(getFileDropTarget({ closest: jest.fn().mockReturnValue(null) })).toBeNull();
    expect(getFileDropTarget(null)).toBeNull();
  });

  test('extracts a card id only from card targets', () => {
    expect(getCardIdFromFileDropTarget('card:card-1')).toBe('card-1');
    expect(getCardIdFromFileDropTarget(NEW_CARD_FILE_DROP_TARGET)).toBeNull();
    expect(getCardIdFromFileDropTarget('card:')).toBeNull();
  });
});
