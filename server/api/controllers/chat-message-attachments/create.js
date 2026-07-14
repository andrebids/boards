/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { rimraf } = require('rimraf');

const { idInput } = require('../../../utils/inputs');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  MESSAGE_DELETED: { messageDeleted: 'Message deleted' },
  NO_FILE_WAS_UPLOADED: { noFileWasUploaded: 'No file was uploaded' },
  ATTACHMENT_LIMIT_REACHED: {
    attachmentLimitReached: 'Attachment limit reached',
  },
};

module.exports = {
  inputs: {
    messageId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    messageNotFound: { responseType: 'notFound' },
    notEnoughRights: { responseType: 'forbidden' },
    messageDeleted: { responseType: 'conflict' },
    noFileWasUploaded: { responseType: 'unprocessableEntity' },
    attachmentLimitReached: { responseType: 'unprocessableEntity' },
    uploadError: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const message = await ChatMessage.qm.getOneById(inputs.messageId);
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation && (await sails.helpers.chat.getConversationAccess(conversation, currentUser));

    if (!message || !access) {
      sails.log.warn('[CHAT_UPLOAD][MESSAGE_ACCESS_REJECTED]', {
        messageId: inputs.messageId,
        hasMessage: Boolean(message),
        hasConversation: Boolean(conversation),
        hasAccess: Boolean(access),
        userId: currentUser.id,
      });
      throw Errors.MESSAGE_NOT_FOUND;
    }
    if (!access.canWrite || message.userId !== currentUser.id) {
      sails.log.warn('[CHAT_UPLOAD][WRITE_ACCESS_REJECTED]', {
        messageId: message.id,
        userId: currentUser.id,
        messageUserId: message.userId,
        canWrite: access.canWrite,
      });
      throw Errors.NOT_ENOUGH_RIGHTS;
    }
    if (message.deletedAt) {
      sails.log.warn('[CHAT_UPLOAD][MESSAGE_DELETED]', {
        messageId: message.id,
        userId: currentUser.id,
      });
      throw Errors.MESSAGE_DELETED;
    }

    sails.log.info('[CHAT_UPLOAD][RECEIVE_START]', {
      messageId: message.id,
      userId: currentUser.id,
      contentType: this.req.headers['content-type'],
      contentLength: this.req.headers['content-length'],
    });

    let files;
    try {
      files = await sails.helpers.utils.receiveFile.with({
        paramName: 'file',
        req: this.req,
        maxBytes: sails.config.custom.chatAttachmentMaxBytes,
      });
    } catch (error) {
      sails.log.error('[CHAT_UPLOAD][RECEIVE_ERROR]', {
        messageId: message.id,
        error: error.message,
        code: error.code,
      });
      return exits.uploadError(error.message);
    }
    sails.log.info('[CHAT_UPLOAD][RECEIVE_DONE]', {
      messageId: message.id,
      fileCount: files.length,
      files: files.map(({ filename, type, size }) => ({ filename, type, size })),
    });
    if (files.length === 0) {
      throw Errors.NO_FILE_WAS_UPLOADED;
    }
    if (files.length > 1) {
      await Promise.all(files.map(({ fd }) => rimraf(fd)));
      throw Errors.ATTACHMENT_LIMIT_REACHED;
    }

    let data;
    try {
      data = await sails.helpers.attachments.processUploadedFile(files[0]);
    } catch (error) {
      return exits.uploadError(error.message);
    }

    let attachment;
    try {
      attachment = await ChatMessageAttachment.qm.createOne(
        {
          messageId: message.id,
          creatorUserId: currentUser.id,
          fileReferenceId: data.fileReferenceId,
          name: data.filename,
          data,
        },
        {
          maxAttachmentsPerMessage: sails.config.custom.chatAttachmentsPerMessageLimit,
        },
      );
    } catch (error) {
      sails.log.error('[CHAT_UPLOAD][PERSIST_ERROR]', {
        messageId: message.id,
        fileReferenceId: data.fileReferenceId,
        error: error.message || error,
        code: error.code,
      });
      try {
        await sails.helpers.chatMessageAttachments.discardFile(data.fileReferenceId);
      } catch (cleanupError) {
        sails.log.error('Failed to clean up a rejected chat attachment', {
          fileReferenceId: data.fileReferenceId,
          error: cleanupError.message,
        });
      }

      if (error === 'attachmentLimitReached') {
        throw Errors.ATTACHMENT_LIMIT_REACHED;
      }
      if (error === 'messageNotFound') {
        throw Errors.MESSAGE_DELETED;
      }

      return exits.uploadError(error.message || 'Could not persist attachment');
    }

    const extras = await sails.helpers.chat.getMessageExtras([message.id]);
    const item = sails.helpers.chat.presentMessage({
      ...message,
      ...extras[message.id],
    });

    sails.sockets.broadcast(
      `chatConversation:${message.conversationId}`,
      'chatMessageUpdate',
      { item },
      this.req,
    );

    const lastMessage = await ChatMessage.qm.getLastByConversationId(conversation.id);
    if (lastMessage && lastMessage.id === message.id) {
      const recipientUserIds =
        conversation.type === ChatConversation.Types.PROJECT_GROUP
          ? access.memberUserIds
          : sails.helpers.utils.mapRecords(access.participants, 'userId', true);
      const uniqueRecipientUserIds = [...new Set(recipientUserIds)];
      const unreadCounts = await sails.helpers.chat.getUnreadCountsForUsers(
        conversation.id,
        uniqueRecipientUserIds,
      );

      uniqueRecipientUserIds.forEach((userId) => {
        sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
          item: {
            id: conversation.id,
            lastMessage: item,
            unreadCount: unreadCounts[userId] || 0,
          },
        });
      });
    }

    return { item, attachment };
  },
};
