/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  ATTACHMENT_NOT_FOUND: { attachmentNotFound: 'Attachment not found' },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    variant: {
      type: 'string',
      isIn: ['original', 'outside360', 'outside720', 'video360', 'video720'],
      defaultsTo: 'original',
    },
  },

  exits: {
    attachmentNotFound: { responseType: 'notFound' },
  },

  async fn(inputs, exits) {
    const attachment = await ChatMessageAttachment.findOne(inputs.id);
    const message = attachment && (await ChatMessage.qm.getOneById(attachment.messageId));
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (!attachment || !access || message.deletedAt) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    let path;
    let contentType = attachment.data.mimeType || 'application/octet-stream';
    let disposition = 'attachment';
    const basePath = `${sails.config.custom.attachmentsPathSegment}/${attachment.data.fileReferenceId}`;

    switch (inputs.variant) {
      case 'outside360':
      case 'outside720': {
        const size = inputs.variant === 'outside360' ? 360 : 720;
        const extension = attachment.data.image && attachment.data.image.thumbnailsExtension;
        if (!extension) {
          throw Errors.ATTACHMENT_NOT_FOUND;
        }
        path = `${basePath}/thumbnails/outside-${size}.${extension}`;
        contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        disposition = 'inline';
        break;
      }
      case 'video360':
      case 'video720': {
        if (
          !attachment.data.video ||
          !attachment.data.video.thumbnails ||
          !attachment.data.video.thumbnails.length
        ) {
          throw Errors.ATTACHMENT_NOT_FOUND;
        }
        const size = inputs.variant === 'video360' ? 360 : 720;
        path = `${basePath}/video-thumbnails/frame-0-${size}.png`;
        contentType = 'image/png';
        disposition = 'inline';
        break;
      }
      default:
        path = `${basePath}/${attachment.data.filename}`;
        disposition = attachment.data.image || attachment.data.video ? 'inline' : 'attachment';
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    let readStream;
    try {
      readStream = await fileManager.read(path);
    } catch (error) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    this.res.type(contentType);
    this.res.set('Content-Disposition', disposition);
    this.res.set('Cache-Control', 'private, max-age=900');
    return exits.success(readStream);
  },
};
