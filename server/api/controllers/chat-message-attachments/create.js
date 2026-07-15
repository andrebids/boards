/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { rimraf } = require('rimraf');

const { idInput } = require('../../../utils/inputs');
const { validateChatAttachment } = require('../../../utils/chat-attachment-policy');

const Errors = {
  MESSAGE_NOT_FOUND: { messageNotFound: 'Message not found' },
  NOT_ENOUGH_RIGHTS: { notEnoughRights: 'Not enough rights' },
  MESSAGE_DELETED: { messageDeleted: 'Message deleted' },
  NO_FILE_WAS_UPLOADED: { noFileWasUploaded: 'No file was uploaded' },
  ATTACHMENT_LIMIT_REACHED: {
    attachmentLimitReached: 'Attachment limit reached',
  },
  UNSUPPORTED_FILE_TYPE: {
    unsupportedFileType: 'File type is not allowed',
  },
  ATTACHMENT_TOO_LARGE: {
    attachmentTooLarge: 'File cannot be larger than 25 MB',
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
    unsupportedFileType: { responseType: 'unprocessableEntity' },
    attachmentTooLarge: { responseType: 'unprocessableEntity' },
    uploadError: { responseType: 'unprocessableEntity' },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;
    const startedAt = Date.now();
    const logContext = {
      messageId: inputs.messageId,
      contentType: this.req.headers['content-type'],
      contentLength: this.req.headers['content-length'],
    };
    let wasAbortLogged = false;
    const logAbortedRequest = (source) => {
      if (wasAbortLogged) return;
      wasAbortLogged = true;
      sails.log.warn('[CHAT_UPLOAD][REQUEST_ABORTED]', {
        ...logContext,
        source,
        durationMs: Date.now() - startedAt,
      });
    };

    this.req.once('aborted', () => logAbortedRequest('request'));
    this.res.once('close', () => {
      if (!this.res.writableEnded) {
        logAbortedRequest('response');
      }
    });

    sails.log.info('[CHAT_UPLOAD][REQUEST_START]', logContext);

    const message = await ChatMessage.qm.getOneById(inputs.messageId);
    const conversation = message && (await ChatConversation.qm.getOneById(message.conversationId));
    const access =
      conversation && (await sails.helpers.chat.getConversationAccess(conversation, currentUser));

    if (message && message.clientMessageId) {
      logContext.clientMessageId = message.clientMessageId;
    }

    if (!message || !access) {
      sails.log.warn('[CHAT_UPLOAD][MESSAGE_ACCESS_REJECTED]', {
        ...logContext,
        hasMessage: Boolean(message),
        hasConversation: Boolean(conversation),
        hasAccess: Boolean(access),
        durationMs: Date.now() - startedAt,
      });
      throw Errors.MESSAGE_NOT_FOUND;
    }
    if (!access.canWrite || message.userId !== currentUser.id) {
      sails.log.warn('[CHAT_UPLOAD][WRITE_ACCESS_REJECTED]', {
        ...logContext,
        isMessageOwner: message.userId === currentUser.id,
        canWrite: access.canWrite,
        durationMs: Date.now() - startedAt,
      });
      throw Errors.NOT_ENOUGH_RIGHTS;
    }
    if (message.deletedAt) {
      sails.log.warn('[CHAT_UPLOAD][MESSAGE_DELETED]', {
        ...logContext,
        durationMs: Date.now() - startedAt,
      });
      throw Errors.MESSAGE_DELETED;
    }

    sails.log.info('[CHAT_UPLOAD][RECEIVE_START]', {
      ...logContext,
      durationMs: Date.now() - startedAt,
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
        ...logContext,
        errorType: error.name,
        errorCode: error.code || 'RECEIVE_ERROR',
        durationMs: Date.now() - startedAt,
      });
      return exits.uploadError(error.message);
    }
    sails.log.info('[CHAT_UPLOAD][RECEIVE_DONE]', {
      ...logContext,
      fileCount: files.length,
      files: files.map(({ type, size }) => ({ type, size })),
      durationMs: Date.now() - startedAt,
    });
    if (files.length === 0) {
      throw Errors.NO_FILE_WAS_UPLOADED;
    }
    if (files.length > 1) {
      await Promise.all(files.map(({ fd }) => rimraf(fd)));
      throw Errors.ATTACHMENT_LIMIT_REACHED;
    }

    const validation = await validateChatAttachment(files[0]);
    if (!validation.isValid) {
      await rimraf(files[0].fd);
      if (validation.reason === 'attachmentTooLarge') {
        sails.log.warn('[CHAT_UPLOAD][FILE_SIZE_REJECTED]', {
          ...logContext,
          reason: validation.reason,
          size: files[0].size,
          durationMs: Date.now() - startedAt,
        });
        throw Errors.ATTACHMENT_TOO_LARGE;
      }
      sails.log.warn('[CHAT_UPLOAD][FILE_TYPE_REJECTED]', {
        ...logContext,
        reason: validation.reason,
        durationMs: Date.now() - startedAt,
      });
      throw Errors.UNSUPPORTED_FILE_TYPE;
    }

    let data;
    try {
      data = await sails.helpers.attachments.processUploadedFile(files[0]);
    } catch (error) {
      sails.log.error('[CHAT_UPLOAD][PROCESS_ERROR]', {
        ...logContext,
        errorType: error.name,
        errorCode: error.code || 'PROCESS_ERROR',
        durationMs: Date.now() - startedAt,
      });
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
        ...logContext,
        fileReferenceId: data.fileReferenceId,
        errorType: error.name,
        errorCode: error.code || (typeof error === 'string' ? error : 'PERSIST_ERROR'),
        durationMs: Date.now() - startedAt,
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
      const uniqueRecipientUserIds =
        await sails.helpers.chat.getConversationRecipientUserIds(conversation);
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

    sails.log.info('[CHAT_UPLOAD][REQUEST_DONE]', {
      ...logContext,
      attachmentId: attachment.id,
      durationMs: Date.now() - startedAt,
    });

    return { item, attachment };
  },
};
