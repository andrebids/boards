import { AttachmentTypes } from '../../constants/Enums';

const getCardImageMedia = (boards) =>
  boards.flatMap((board) =>
    board.cards.flatMap((card) =>
      card.attachments
        .filter(
          (attachment) =>
            attachment.type === AttachmentTypes.FILE &&
            attachment.data?.image &&
            !attachment.data.video &&
            attachment.data.url,
        )
        .map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.data.url,
          thumbnailUrl: attachment.data.thumbnailUrls?.outside360 || attachment.data.url,
          boardName: board.name,
          cardName: card.name,
        })),
    ),
  );

export default getCardImageMedia;
