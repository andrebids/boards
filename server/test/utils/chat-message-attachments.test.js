const { expect } = require('chai');

const queryMethods = require('../../api/hooks/query-methods/models/ChatMessageAttachment');

describe('Chat message attachment query methods', () => {
  let previousGlobals;
  let nativeQueries;
  let createCalls;
  let destroyCalls;
  let nativeQueryHandler;

  beforeEach(() => {
    previousGlobals = {
      sails: global.sails,
      ChatMessageAttachment: global.ChatMessageAttachment,
    };
    nativeQueries = [];
    createCalls = [];
    destroyCalls = [];

    const db = { name: 'test-connection' };
    global.sails = {
      getDatastore: () => ({
        transaction: (callback) => callback(db),
      }),
      sendNativeQuery: (query, values) => ({
        usingConnection: async (connection) => {
          expect(connection).to.equal(db);
          nativeQueries.push({ query, values });
          return nativeQueryHandler(query, values);
        },
      }),
    };

    global.ChatMessageAttachment = {
      create: (values) => {
        createCalls.push(values);
        return {
          fetch: () => ({
            usingConnection: async (connection) => {
              expect(connection).to.equal(db);
              return { id: 'attachment-1', ...values };
            },
          }),
        };
      },
      destroy: (criteria) => {
        destroyCalls.push(criteria);
        return {
          fetch: () => ({
            usingConnection: async (connection) => {
              expect(connection).to.equal(db);
              return [];
            },
          }),
        };
      },
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

  it('creates the attachment and increments its file reference in one transaction', async () => {
    nativeQueryHandler = (query) => {
      if (query.includes('SELECT id FROM chat_message')) {
        return { rowCount: 1, rows: [{ id: 'message-1' }] };
      }
      if (query.includes('COUNT(*)')) {
        return { rowCount: 1, rows: [{ total: 1 }] };
      }
      return { rowCount: 1, rows: [{ id: 'file-1', total: 1 }] };
    };

    const values = {
      messageId: 'message-1',
      fileReferenceId: 'file-1',
      name: 'brief.pdf',
      data: { fileReferenceId: 'file-1' },
    };
    const attachment = await queryMethods.createOne(values, {
      maxAttachmentsPerMessage: 10,
    });

    expect(attachment).to.include({ id: 'attachment-1', name: 'brief.pdf' });
    expect(createCalls).to.deep.equal([values]);
    expect(
      nativeQueries.map(({ query }) => query.trim().split(/\s+/).slice(0, 2).join(' ')),
    ).to.deep.equal(['SELECT id', 'SELECT COUNT(*)::int', 'UPDATE file_reference']);
  });

  it('rejects a concurrent upload when the per-message limit has been reached', async () => {
    nativeQueryHandler = (query) => {
      if (query.includes('SELECT id FROM chat_message')) {
        return { rowCount: 1, rows: [{ id: 'message-1' }] };
      }
      return { rowCount: 1, rows: [{ total: 10 }] };
    };

    let error;
    try {
      await queryMethods.createOne(
        {
          messageId: 'message-1',
          fileReferenceId: 'file-1',
        },
        { maxAttachmentsPerMessage: 10 },
      );
    } catch (currentError) {
      error = currentError;
    }

    expect(error).to.equal('attachmentLimitReached');
    expect(createCalls).to.have.length(0);
    expect(nativeQueries).to.have.length(2);
  });

  it('decrements shared file references by the number of deleted attachments', async () => {
    global.ChatMessageAttachment.destroy = (criteria) => {
      destroyCalls.push(criteria);
      return {
        fetch: () => ({
          usingConnection: async () => [
            { fileReferenceId: '21' },
            { fileReferenceId: '21' },
            { fileReferenceId: '34' },
          ],
        }),
      };
    };
    nativeQueryHandler = () => ({
      rowCount: 2,
      rows: [
        { id: '21', total: null },
        { id: '34', total: 3 },
      ],
    });

    const result = await queryMethods.deleteByMessageIds(['message-1', 'message-2']);

    expect(destroyCalls).to.deep.equal([{ messageId: ['message-1', 'message-2'] }]);
    expect(result.attachments).to.have.length(3);
    expect(result.fileReferences).to.deep.equal([{ id: '21', total: null }]);
    expect(nativeQueries[0].values.slice(0, 4)).to.deep.equal(['21', 2, '34', 1]);
  });

  it('deletes project chat attachments set-wise and remains safe to repeat', async () => {
    let invocation = 0;
    nativeQueryHandler = () => {
      invocation += 1;

      return {
        rowCount: invocation === 1 ? 2 : 0,
        rows:
          invocation === 1
            ? [
                { id: '21', total: null },
                { id: '34', total: 2 },
              ]
            : [],
      };
    };

    const firstResult = await queryMethods.deleteByProjectIds(['project-1', 'project-2']);
    const secondResult = await queryMethods.deleteByProjectIds(['project-1', 'project-2']);

    expect(firstResult.fileReferences).to.deep.equal([{ id: '21', total: null }]);
    expect(secondResult.fileReferences).to.deep.equal([]);
    expect(nativeQueries).to.have.length(2);
    expect(nativeQueries[0].query).to.include('DELETE FROM chat_message_attachment');
    expect(nativeQueries[0].query).to.not.include('message.text');
    expect(nativeQueries[0].values[0]).to.deep.equal(['project-1', 'project-2']);
  });
});
