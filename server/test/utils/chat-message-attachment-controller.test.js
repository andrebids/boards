const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

const controller = require('../../api/controllers/chat-message-attachments/create');

describe('Chat message attachment controller', () => {
  let previousGlobals;
  let broadcasts;
  let broadcastError;
  let responseStatus;
  let createdValues;
  let temporaryDirectory;
  let temporaryFile;

  beforeEach(() => {
    previousGlobals = {
      sails: global.sails,
      ChatMessage: global.ChatMessage,
      ChatConversation: global.ChatConversation,
      ChatMessageAttachment: global.ChatMessageAttachment,
    };
    broadcasts = [];
    broadcastError = null;
    responseStatus = null;
    createdValues = null;
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'planka-chat-controller-'));
    temporaryFile = path.join(temporaryDirectory, 'image.png');
    fs.writeFileSync(temporaryFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    global.sails = {
      config: {
        custom: {
          chatAttachmentMaxBytes: 25,
          psdAttachmentMaxBytes: 500,
          videoAttachmentMaxBytes: 500,
          chatAttachmentsPerMessageLimit: 10,
        },
      },
      helpers: {
        attachments: {
          processUploadedFile: async () => ({
            fileReferenceId: 'file-1',
            filename: 'image.png',
            mimeType: 'image/png',
            sizeInBytes: 12,
            image: { width: 10, height: 10, thumbnailsExtension: 'png' },
            video: null,
          }),
        },
        chat: {
          getConversationAccess: async () => ({ canWrite: true }),
          getMessageExtras: async () => {
            throw new Error('post-persist message query must not run');
          },
          getConversationRecipientUserIds: async () => {
            throw new Error('recipient query must not run');
          },
          getUnreadCountsForUsers: async () => {
            throw new Error('unread query must not run');
          },
        },
        chatMessageAttachments: {
          discardFile: async () => {},
          presentOne: (record) => ({ id: record.id, name: record.name }),
        },
        utils: {
          receiveFile: {
            with: async () => [
              { fd: temporaryFile, filename: 'image.png', size: 8, type: 'image/png' },
            ],
          },
        },
      },
      log: {
        error: () => {},
        info: () => {},
        warn: () => {},
      },
      sockets: {
        broadcast: (...args) => {
          if (broadcastError) {
            throw broadcastError;
          }
          broadcasts.push(args);
        },
      },
    };
    global.ChatMessage = {
      qm: {
        getOneById: async () => ({
          id: 'message-1',
          conversationId: 'conversation-1',
          userId: 'user-1',
          clientMessageId: 'client-message-1',
          text: 'hello',
        }),
      },
    };
    global.ChatConversation = {
      qm: {
        getOneById: async () => ({
          id: 'conversation-1',
          projectId: 'project-1',
        }),
      },
    };
    global.ChatMessageAttachment = {
      qm: {
        createOne: async (values) => {
          createdValues = values;
          return {
            attachment: {
              id: 'attachment-1',
              messageId: 'message-1',
              name: 'image.png',
              data: { fileReferenceId: 'file-1' },
            },
            isCreated: true,
          };
        },
      },
    };
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });

    Object.entries(previousGlobals).forEach(([name, value]) => {
      if (value === undefined) {
        delete global[name];
      } else {
        global[name] = value;
      }
    });
  });

  it('returns the persisted attachment without running conversation queries', async () => {
    const request = {
      currentUser: { id: 'user-1' },
      headers: {
        'content-length': '12',
        'content-type': 'multipart/form-data',
        'x-client-attachment-id': 'client-attachment-from-header',
      },
      once: () => {},
    };
    const response = {
      once: () => {},
      status: (status) => {
        responseStatus = status;
      },
      writableEnded: false,
    };

    const result = await controller.fn.call(
      { req: request, res: response },
      { messageId: 'message-1' },
      {},
    );
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(responseStatus).to.equal(201);
    expect(createdValues.clientAttachmentId).to.equal('client-attachment-from-header');
    expect(result).to.deep.equal({
      item: { id: 'attachment-1', name: 'image.png' },
      messageId: 'message-1',
    });
    expect(broadcasts).to.have.length(1);
    expect(broadcasts[0].slice(0, 3)).to.deep.equal([
      'chatConversation:conversation-1',
      'chatMessageAttachmentCreate',
      {
        item: { id: 'attachment-1', name: 'image.png' },
        messageId: 'message-1',
      },
    ]);
  });

  it('keeps the successful response when publishing fails', async () => {
    broadcastError = new Error('socket unavailable');
    const response = {
      once: () => {},
      status: (status) => {
        responseStatus = status;
      },
      writableEnded: false,
    };

    const result = await controller.fn.call(
      {
        req: {
          currentUser: { id: 'user-1' },
          headers: { 'content-length': '8', 'content-type': 'multipart/form-data' },
          once: () => {},
        },
        res: response,
      },
      { messageId: 'message-1', clientAttachmentId: 'client-attachment-1' },
      {},
    );
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(responseStatus).to.equal(201);
    expect(result.item.id).to.equal('attachment-1');
    expect(broadcasts).to.have.length(0);
  });
});
