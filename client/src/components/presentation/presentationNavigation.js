const makePresentationBoardSearchParams = (boardId) => (boardId ? { board: boardId } : {});

export const makePathWithPresentationBoard = (pathname, boardId) => {
  const searchParams = new URLSearchParams(makePresentationBoardSearchParams(boardId));
  const search = searchParams.toString();

  return search ? `${pathname}?${search}` : pathname;
};

export default makePresentationBoardSearchParams;
