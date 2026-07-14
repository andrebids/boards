/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');

const controller = require('../../api/controllers/chat-diagnostics/create');

describe('Chat delivery diagnostics', () => {
  let previousSails;
  let logEntries;

  beforeEach(() => {
    previousSails = global.sails;
    logEntries = [];
    global.sails = {
      log: {
        warn: (event, context) => logEntries.push({ event, context }),
      },
    };
  });

  afterEach(() => {
    if (previousSails === undefined) {
      delete global.sails;
    } else {
      global.sails = previousSails;
    }
  });

  it('records only bounded technical delivery metadata', async () => {
    await controller.fn.call(
      { req: { currentUser: { id: 'user-observability-test' } } },
      {
        event: 'attachment-upload-failed',
        transport: 'http',
        clientMessageId: 'client\nmessage',
        messageId: 'message-1',
        errorCode: 'TypeError\nprivate detail',
        durationMs: 1200,
        online: true,
        hasAttachments: true,
        fileCount: 1,
        fileSizeBucket: 'under-1mb',
        mimeGroup: 'image',
        attempt: 1,
      },
    );

    expect(logEntries).to.have.length(1);
    expect(logEntries[0]).to.deep.equal({
      event: '[CHAT_CLIENT][DELIVERY_FAILURE]',
      context: {
        event: 'attachment-upload-failed',
        transport: 'http',
        clientMessageId: 'client_message',
        messageId: 'message-1',
        errorCode: 'TypeError_private_detail',
        statusCode: undefined,
        durationMs: 1200,
        online: true,
        hasAttachments: true,
        fileCount: 1,
        fileSizeBucket: 'under-1mb',
        mimeGroup: 'image',
        attempt: 1,
      },
    });
  });
});
