import { createSelector } from 'redux-orm';

import orm from '../../orm';
import getCardImageMedia from './presentationMediaItems';

const makeSelectPresentationCardImageMedia = () =>
  createSelector(
    orm,
    (_, boardIds) => boardIds,
    ({ Board }, boardIds) =>
      getCardImageMedia(
        boardIds.flatMap((boardId) => {
          const board = Board.withId(boardId);
          if (!board) {
            return [];
          }

          return [
            {
              ...board.ref,
              cards: board.getCardsModelArray().map((card) => ({
                ...card.ref,
                attachments: card.getAttachmentsQuerySet().toRefArray(),
              })),
            },
          ];
        }),
      ),
  );

export default makeSelectPresentationCardImageMedia;
