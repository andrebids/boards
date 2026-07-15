/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');

const controller = require('../../api/controllers/chat-messages/create');
const helper = require('../../api/helpers/chat/create-message');
const model = require('../../api/models/ChatMessage');

describe('Chat message creation contract', () => {
  let previousGlobals;

  beforeEach(() => {
    previousGlobals = {
      sails: global.sails,
      ChatConversation: global.ChatConversation,
    };
  });

  afterEach(() => {
    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  it('allows empty text when the message declares an attachment', async () => {
    let createMessageInputs;
    const conversation = { id: 'conversation-1', type: 'projectGroup' };
    const createdMessage = {
      id: 'message-1',
      conversationId: conversation.id,
      text: '',
    };

    global.ChatConversation = {
      Types: { PROJECT_DIRECT: 'projectDirect' },
      qm: { getOneById: async () => conversation },
    };
    global.sails = {
      log: { info: () => {}, warn: () => {}, error: () => {} },
      helpers: {
        chat: {
          getConversationAccess: {
            with: async () => ({
              canWrite: true,
              memberUserIds: [],
              participants: [],
              project: { id: 'project-1' },
            }),
          },
          createMessage: {
            with: (inputs) => {
              createMessageInputs = inputs;
              return { intercept: async () => createdMessage };
            },
          },
          presentMessage: (message) => message,
        },
        users: { presentOne: (user) => user },
        utils: { mapRecords: () => [] },
      },
    };

    const result = await controller.fn.call(
      { req: { currentUser: { id: 'user-1' }, isSocket: true } },
      {
        conversationId: conversation.id,
        text: '',
        hasAttachments: true,
        clientMessageId: 'client-message-1',
      },
    );

    expect(createMessageInputs.text).to.equal('');
    expect(result.item).to.equal(createdMessage);
    expect(controller.inputs.text).to.include({ defaultsTo: '' });
    expect(helper.inputs.text).to.include({ defaultsTo: '' });
    expect(model.attributes.text).to.include({ defaultsTo: '' });
  });
});
