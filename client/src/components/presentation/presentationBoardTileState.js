const getEnabledPresentationForBoard = (presentations, boardId) =>
  presentations.find(
    (presentation) => presentation.boardId === boardId && presentation.isEnabled,
  ) || null;

export const getPresentationBoardTileMode = (presentations, boardId, canEdit) => {
  if (getEnabledPresentationForBoard(presentations, boardId)) {
    return 'open';
  }

  return canEdit ? 'create' : null;
};

export default getEnabledPresentationForBoard;
