/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';

import selectors from '../../../selectors';
import ModalTypes from '../../../constants/ModalTypes';
import { BoardContexts, BoardViews } from '../../../constants/Enums';
import KanbanContent from './KanbanContent';
import FiniteContent from './FiniteContent';
import EndlessContent from './EndlessContent';
import FinanceContent from './FinanceContent';
import CardModal from '../../cards/CardModal';
import BoardActivitiesModal from '../../activities/BoardActivitiesModal';

const Board = React.memo(() => {
  const board = useSelector(selectors.selectCurrentBoard);
  const modal = useSelector(selectors.selectCurrentModal);
  const isCardModalOpened = useSelector(
    state => !!selectors.selectPath(state).cardId
  );

  let Content;
  if (board.view === BoardViews.FINANCE) {
    Content = FinanceContent;
  } else if (board.view === BoardViews.KANBAN) {
    Content = KanbanContent;
  } else {
    switch (board.context) {
      case BoardContexts.BOARD:
        Content = FiniteContent;

        break;
      case BoardContexts.ARCHIVE:
      case BoardContexts.TRASH:
        Content = EndlessContent;

        break;
      default:
        Content = KanbanContent; // Fallback para Kanban
    }
  }

  let modalNode = null;
  if (isCardModalOpened) {
    modalNode = <CardModal />;
  } else if (modal) {
    switch (modal.type) {
      case ModalTypes.BOARD_ACTIVITIES:
        modalNode = <BoardActivitiesModal />;

        break;
      default:
    }
  }

  // Verificar se Content está definido antes de renderizar
  if (!Content) {
    console.error('Board Content component is undefined', { board, view: board.view, context: board.context });
    return null;
  }

  return (
    <>
      <Content />
      {modalNode}
    </>
  );
});

export default Board;
