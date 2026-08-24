export const NEW_CARD_FILE_DROP_TARGET = 'new-card';

export const getFileDropTarget = (target) =>
  target?.closest?.('[data-file-drop-target]')?.dataset.fileDropTarget || null;

export const getCardIdFromFileDropTarget = (target) => {
  if (typeof target !== 'string' || !target.startsWith('card:')) {
    return null;
  }

  return target.slice('card:'.length) || null;
};
