import Paths from '../../constants/Paths';

const makePresentationBoardSearchParams = (boardId) => (boardId ? { board: boardId } : {});

export const getPresentationBoardContextId = (routePath, searchParams) =>
  routePath === Paths.PRESENTATION ? searchParams.get('board') : null;

export const makePathWithPresentationBoard = (pathname, boardId) => {
  const searchParams = new URLSearchParams(makePresentationBoardSearchParams(boardId));
  const search = searchParams.toString();

  return search ? `${pathname}?${search}` : pathname;
};

export default makePresentationBoardSearchParams;
