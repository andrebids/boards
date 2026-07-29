/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { prepareFileStream } = require('../../../utils/stream-file');

const Errors = {
  ATTACHMENT_NOT_FOUND: {
    attachmentNotFound: 'Attachment not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    attachmentNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs, exits) {
    const attachment = await ChatMessageAttachment.findOne(inputs.id);
    const message = attachment && (await ChatMessage.qm.getOneById(attachment.messageId));
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation &&
      (await sails.helpers.chat.getConversationAccess(conversation, this.req.currentUser));
    if (
      !attachment ||
      !access ||
      message.deletedAt ||
      !attachment.data.video ||
      attachment.data.video.status !== 'ready' ||
      !attachment.data.video.playback
    ) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();
    const path = `${sails.config.custom.attachmentsPathSegment}/${attachment.data.fileReferenceId}/video/${attachment.data.video.playback.filename}`;
    let prepared;
    try {
      prepared = await prepareFileStream({
        req: this.req,
        res: this.res,
        fileManager,
        path,
        contentType: attachment.data.video.playback.mimeType,
      });
    } catch (error) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    return prepared.handled ? exits.success() : exits.success(prepared.stream);
  },
};
