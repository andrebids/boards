/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  sync: true,

  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    const { record } = inputs;
    const baseUrl = `${sails.config.custom.baseUrl}/api/chat-message-attachments/${record.id}`;
    let thumbnailUrls = null;

    if (record.data && record.data.image && record.data.image.thumbnailsExtension) {
      thumbnailUrls = {
        outside360: `${baseUrl}/download?variant=outside360`,
        outside720: `${baseUrl}/download?variant=outside720`,
      };
    } else if (
      record.data &&
      record.data.video &&
      record.data.video.thumbnails &&
      record.data.video.thumbnails.length > 0
    ) {
      thumbnailUrls = {
        outside360: `${baseUrl}/download?variant=video360`,
        outside720: `${baseUrl}/download?variant=video720`,
      };
    }

    return {
      ..._.omit(record, 'fileReferenceId'),
      data: {
        ..._.omit(record.data, ['fileReferenceId', 'filename', 'image.thumbnailsExtension']),
        url: `${baseUrl}/download`,
        thumbnailUrls,
      },
    };
  },
};
