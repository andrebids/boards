/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import truncate from 'lodash/truncate';

import api from '../../../api';
import { AttachmentTypes } from '../../../constants/Enums';
import { createLocalId } from '../../../utils/local-id';

export const getInlineImageUrl = (attachment) =>
  attachment.data.thumbnailUrls?.outside720 ||
  attachment.data.thumbnailUrls?.outside360 ||
  attachment.data.url;

export const uploadCommentImage = async ({ cardId, accessToken, file }) => {
  const requestId = createLocalId();
  const { item: attachment } = await api.createAttachmentWithFile(
    cardId,
    {
      file,
      type: AttachmentTypes.FILE,
      name: truncate(file.name, {
        length: 128,
      }),
      skipCover: true,
    },
    requestId,
    {
      Authorization: `Bearer ${accessToken}`,
    },
  );

  return {
    attachment,
    requestId,
    url: getInlineImageUrl(attachment),
  };
};
