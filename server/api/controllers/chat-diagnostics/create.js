/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const EVENTS = ['message-create-failed', 'attachment-upload-failed'];
const TRANSPORTS = ['socket', 'http'];
const FILE_SIZE_BUCKETS = ['none', 'under-1mb', '1mb-5mb', '5mb-25mb', 'over-25mb'];
const MIME_GROUPS = ['none', 'image', 'video', 'audio', 'text', 'application', 'other'];
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 20;
const recentEventsByUserId = new Map();

const normalizeToken = (value) =>
  value
    ? String(value)
        .replace(/[^a-zA-Z0-9_.:-]/g, '_')
        .slice(0, 128)
    : undefined;

module.exports = {
  inputs: {
    event: {
      type: 'string',
      isIn: EVENTS,
      required: true,
    },
    transport: {
      type: 'string',
      isIn: TRANSPORTS,
      required: true,
    },
    clientMessageId: {
      type: 'string',
      maxLength: 128,
    },
    messageId: {
      type: 'string',
      maxLength: 128,
    },
    errorCode: {
      type: 'string',
      maxLength: 128,
    },
    statusCode: {
      type: 'number',
      min: 0,
      max: 599,
    },
    durationMs: {
      type: 'number',
      min: 0,
      max: 10 * 60 * 1000,
    },
    online: {
      type: 'boolean',
    },
    hasAttachments: {
      type: 'boolean',
    },
    fileCount: {
      type: 'number',
      min: 0,
      max: 10,
    },
    fileSizeBucket: {
      type: 'string',
      isIn: FILE_SIZE_BUCKETS,
    },
    mimeGroup: {
      type: 'string',
      isIn: MIME_GROUPS,
    },
    attempt: {
      type: 'number',
      min: 1,
      max: 10,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const now = Date.now();
    const recentEvents = (recentEventsByUserId.get(currentUser.id) || []).filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW,
    );

    if (recentEvents.length >= RATE_LIMIT_MAX_EVENTS) {
      recentEventsByUserId.set(currentUser.id, recentEvents);
      return {};
    }

    recentEvents.push(now);
    recentEventsByUserId.set(currentUser.id, recentEvents);

    sails.log.warn('[CHAT_CLIENT][DELIVERY_FAILURE]', {
      event: inputs.event,
      transport: inputs.transport,
      clientMessageId: normalizeToken(inputs.clientMessageId),
      messageId: normalizeToken(inputs.messageId),
      errorCode: normalizeToken(inputs.errorCode),
      statusCode: inputs.statusCode,
      durationMs: inputs.durationMs,
      online: inputs.online,
      hasAttachments: inputs.hasAttachments,
      fileCount: inputs.fileCount,
      fileSizeBucket: inputs.fileSizeBucket,
      mimeGroup: inputs.mimeGroup,
      attempt: inputs.attempt,
    });

    return {};
  },
};
