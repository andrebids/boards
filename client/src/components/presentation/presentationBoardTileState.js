const getEnabledPresentationForBoard = (presentations, boardId) =>
  presentations.find(
    (presentation) => presentation.boardId === boardId && presentation.isEnabled,
  ) || null;

export const getPresentationBoardTilePreview = (presentation) => {
  const documentData = presentation?.documentData;
  const preview = documentData?.preview;

  if (
    preview?.status !== 'ready' ||
    !preview.filename ||
    preview.sourceFilename !== documentData?.filename
  ) {
    return null;
  }

  return preview;
};

export const getPresentationBoardTileMode = (presentations, boardId, canEdit) => {
  if (getEnabledPresentationForBoard(presentations, boardId)) {
    return 'open';
  }

  return canEdit ? 'create' : null;
};

export default getEnabledPresentationForBoard;
