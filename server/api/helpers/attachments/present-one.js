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
    const basePath = sails.config.custom.baseUrlPath.replace(/\/$/, '');
    let data;
    if (inputs.record.type === Attachment.Types.FILE) {
      let thumbnailUrls = null;
      if (
        inputs.record.data &&
        inputs.record.data.image &&
        inputs.record.data.image.thumbnailsExtension
      ) {
        thumbnailUrls = {
          outside360: `${basePath}/attachments/${inputs.record.id}/download/thumbnails/outside-360.${inputs.record.data.image.thumbnailsExtension}`,
          outside720: `${basePath}/attachments/${inputs.record.id}/download/thumbnails/outside-720.${inputs.record.data.image.thumbnailsExtension}`,
        };
      } else if (
        inputs.record.data &&
        inputs.record.data.video &&
        inputs.record.data.video.thumbnails &&
        inputs.record.data.video.thumbnails.length > 0
      ) {
        thumbnailUrls = {
          outside360: `${basePath}/attachments/${inputs.record.id}/download/video-thumbnails/frame-0-360.png`,
          outside720: `${basePath}/attachments/${inputs.record.id}/download/video-thumbnails/frame-0-720.png`,
        };
      }

      data = {
        ...inputs.record,
        data: {
          ..._.omit(inputs.record.data, [
            'fileReferenceId',
            'filename',
            'image.thumbnailsExtension',
          ]),
          url: `${basePath}/attachments/${inputs.record.id}/download/${inputs.record.data.filename}`,
          playbackUrl:
            inputs.record.data.video &&
            inputs.record.data.video.status === 'ready' &&
            inputs.record.data.video.playback
              ? `${basePath}/attachments/${inputs.record.id}/stream`
              : null,
          thumbnailUrls,
        },
      };
    } else if (inputs.record.type === Attachment.Types.LINK) {
      const faviconFilename = `${inputs.record.data.hostname}.png`;

      let faviconUrl = null;
      if (sails.helpers.utils.isPreloadedFaviconExists(inputs.record.data.hostname)) {
        faviconUrl = `${sails.config.custom.baseUrl}/preloaded-favicons/${faviconFilename}`;
      } else {
        const fileManager = sails.hooks['file-manager'].getInstance();
        faviconUrl = `${fileManager.buildUrl(`${sails.config.custom.faviconsPathSegment}/${faviconFilename}`)}`;
      }

      data = {
        ...inputs.record,
        data: {
          ..._.omit(inputs.record.data, 'hostname'),
          faviconUrl,
        },
      };
    }

    return data;
  },
};
