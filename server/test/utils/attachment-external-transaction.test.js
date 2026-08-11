/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { expect } = require('chai');
const lodash = require('lodash');

const attachmentQueryMethods = require('../../api/hooks/query-methods/models/Attachment');

const createDeferredQuery = (execute) => ({
  fetch() {
    return this;
  },
  usingConnection(connection) {
    return execute(connection);
  },
});

describe('Attachment external transactions', () => {
  const globalNames = ['_', 'sails', 'Attachment'];

  let previousGlobals;

  beforeEach(() => {
    previousGlobals = Object.fromEntries(globalNames.map((name) => [name, global[name]]));
    global._ = lodash;
  });

  afterEach(() => {
    globalNames.forEach((name) => {
      if (previousGlobals[name] === undefined) {
        delete global[name];
      } else {
        global[name] = previousGlobals[name];
      }
    });
  });

  const setUp = ({ failCreate = false, failFileReferenceUpdate = false } = {}) => {
    const db = { id: 'caller-transaction' };
    const pendingWrites = [];
    const committedWrites = [];
    const usedConnections = [];
    let nestedTransactionCalls = 0;

    const useConnection = (connection, write, result, shouldFail = false) => {
      usedConnections.push(connection);
      if (shouldFail) {
        throw new Error(`${write} failed`);
      }
      pendingWrites.push(write);
      return result;
    };

    global.Attachment = {
      Types: { FILE: 'file' },
      create: () =>
        createDeferredQuery((connection) =>
          useConnection(
            connection,
            'attachment:create',
            {
              id: 'attachment-1',
              type: 'file',
              data: { fileReferenceId: 'file-reference-1' },
            },
            failCreate,
          ),
        ),
      destroyOne: () =>
        createDeferredQuery((connection) =>
          useConnection(connection, 'attachment:delete', {
            id: 'attachment-1',
            type: 'file',
            data: { fileReferenceId: 'file-reference-1' },
          }),
        ),
    };

    global.sails = {
      getDatastore: () => ({
        transaction: () => {
          nestedTransactionCalls += 1;
          throw new Error('unexpected nested transaction');
        },
      }),
      sendNativeQuery: (query) =>
        createDeferredQuery((connection) => {
          const write = query.includes('total + 1')
            ? 'file-reference:increment'
            : 'file-reference:decrement';
          return useConnection(
            connection,
            write,
            {
              rowCount: 1,
              rows: [{ id: 'file-reference-1', total: write.endsWith('decrement') ? null : 2 }],
            },
            failFileReferenceUpdate,
          );
        }),
      helpers: {
        videoProcessing: {
          enqueue: {
            with: async () => undefined,
          },
        },
      },
    };

    const transaction = async (callback) => {
      try {
        const result = await callback(db);
        committedWrites.push(...pendingWrites);
        pendingWrites.length = 0;
        return result;
      } catch (error) {
        pendingWrites.length = 0;
        throw error;
      }
    };

    return {
      db,
      pendingWrites,
      committedWrites,
      usedConnections,
      transaction,
      getNestedTransactionCalls: () => nestedTransactionCalls,
    };
  };

  it('creates a FILE attachment and increments its reference on the caller connection', async () => {
    const state = setUp();

    const attachment = await state.transaction((connection) =>
      attachmentQueryMethods.createOne(
        {
          type: 'file',
          data: { fileReferenceId: 'file-reference-1', filename: 'document.pdf' },
        },
        { connection },
      ),
    );

    expect(attachment.id).to.equal('attachment-1');
    expect(state.committedWrites).to.deep.equal(['attachment:create', 'file-reference:increment']);
    expect(state.usedConnections).to.deep.equal([state.db, state.db]);
    expect(state.getNestedTransactionCalls()).to.equal(0);
  });

  it('rolls back the attachment creation when the reference increment fails', async () => {
    const state = setUp({ failFileReferenceUpdate: true });

    let error;
    try {
      await state.transaction((connection) =>
        attachmentQueryMethods.createOne(
          {
            type: 'file',
            data: { fileReferenceId: 'file-reference-1', filename: 'document.pdf' },
          },
          { connection },
        ),
      );
    } catch (nextError) {
      error = nextError;
    }

    expect(error).to.be.an('error').with.property('message', 'file-reference:increment failed');
    expect(state.pendingWrites).to.deep.equal([]);
    expect(state.committedWrites).to.deep.equal([]);
    expect(state.usedConnections).to.deep.equal([state.db, state.db]);
    expect(state.getNestedTransactionCalls()).to.equal(0);
  });

  it('deletes a FILE attachment and decrements its reference on the caller connection', async () => {
    const state = setUp();

    const result = await state.transaction((connection) =>
      attachmentQueryMethods.deleteOne('attachment-1', { isFile: true, connection }),
    );

    expect(result.attachment.id).to.equal('attachment-1');
    expect(result.fileReference).to.deep.equal({ id: 'file-reference-1', total: null });
    expect(state.committedWrites).to.deep.equal(['attachment:delete', 'file-reference:decrement']);
    expect(state.usedConnections).to.deep.equal([state.db, state.db]);
    expect(state.getNestedTransactionCalls()).to.equal(0);
  });

  it('rolls back the attachment deletion when the reference decrement fails', async () => {
    const state = setUp({ failFileReferenceUpdate: true });

    let error;
    try {
      await state.transaction((connection) =>
        attachmentQueryMethods.deleteOne('attachment-1', { isFile: true, connection }),
      );
    } catch (nextError) {
      error = nextError;
    }

    expect(error).to.be.an('error').with.property('message', 'file-reference:decrement failed');
    expect(state.pendingWrites).to.deep.equal([]);
    expect(state.committedWrites).to.deep.equal([]);
    expect(state.usedConnections).to.deep.equal([state.db, state.db]);
    expect(state.getNestedTransactionCalls()).to.equal(0);
  });
});
