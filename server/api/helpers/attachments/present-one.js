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
    let data;
    if (inputs.record.type === Attachment.Types.FILE) {
      // Verificar se é vídeo
      const isVideo = inputs.record.data && inputs.record.data.video;

      data = {
        ...inputs.record,
        data: {
          ..._.omit(inputs.record.data, [
            'fileReferenceId',
            'filename',
            'image.thumbnailsExtension',
          ]),
          url: `${sails.config.custom.baseUrl}/attachments/${inputs.record.id}/download/${inputs.record.data.filename}`,
          thumbnailUrls: inputs.record.data && inputs.record.data.image && inputs.record.data.image.thumbnailsExtension ? {
            outside360: `${sails.config.custom.baseUrl}/attachments/${inputs.record.id}/download/thumbnails/outside-360.${inputs.record.data.image.thumbnailsExtension}`,
            outside720: `${sails.config.custom.baseUrl}/attachments/${inputs.record.id}/download/thumbnails/outside-720.${inputs.record.data.image.thumbnailsExtension}`,
          } : inputs.record.data && inputs.record.data.video && inputs.record.data.video.thumbnails && inputs.record.data.video.thumbnails.length > 0 ? {
            // Para vídeos, usar o primeiro (e único) frame gerado
            outside360: `${sails.config.custom.baseUrl}/attachments/${inputs.record.id}/download/video-thumbnails/frame-0-360.png`,
            outside720: `${sails.config.custom.baseUrl}/attachments/${inputs.record.id}/download/video-thumbnails/frame-0-720.png`,
          } : null,
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
