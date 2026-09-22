// Mutable fixtures model another committed mutation before publication reacquires its lock.
/* eslint-disable no-param-reassign */
const { expect } = require('chai');

const leave = require('../../api/controllers/chat-conversations/leave');
const add = require('../../api/controllers/chat-conversation-participants/create');
const remove = require('../../api/controllers/chat-conversation-participants/delete');
const rename = require('../../api/controllers/chat-conversations/update');
const accessHelper = require('../../api/helpers/chat/get-conversation-access');
const { publishCurrentConversationState } = require('../../utils/chat-lifecycle');

const setup = () => {
  const state = {
    conversation: { id: '1', projectId: '2', type: 'projectCustomGroup', title: 'Before' },
    participants: [
      { id: '10', conversationId: '1', userId: '3', role: 'owner', leftAt: null },
      { id: '11', conversationId: '1', userId: '4', role: 'member', leftAt: null },
      { id: '12', conversationId: '1', userId: '5', role: 'member', leftAt: null },
    ],
    memberUserIds: ['3', '4', '5', '6'],
    events: [],
    transactions: [],
  };
  const clone = (value) => value && JSON.parse(JSON.stringify(value));
  const query = (action) => {
    const result = {
      set(values) {
        return query(() => action(values));
      },
      fetch() {
        return result;
      },
      sort() {
        return result;
      },
      usingConnection: async (db) => {
        expect(db.locked).to.equal(true);
        return clone(action());
      },
    };
    return result;
  };
  global.ChatConversation = {
    Types: { PROJECT_CUSTOM_GROUP: 'projectCustomGroup', PROJECT_GROUP: 'projectGroup' },
    qm: { getOneById: async () => clone(state.conversation) },
    findOne: () => query(() => state.conversation),
    updateOne: () => query((values) => Object.assign(state.conversation, values)),
  };
  global.ChatParticipant = {
    Roles: { OWNER: 'owner', MEMBER: 'member' },
    qm: { getByConversationId: async () => clone(state.participants) },
    find: () => query(() => state.participants),
    updateOne: (id) =>
      query((values) =>
        Object.assign(
          state.participants.find((p) => p.id === id),
          values,
        ),
      ),
    create: (values) =>
      query(() => {
        const participant = { id: '13', leftAt: null, ...values };
        state.participants.push(participant);
        return participant;
      }),
  };
  global.Project = {
    ChatModes: { DISABLED: 'disabled' },
    qm: { getOneById: async () => ({ id: '2', chatMode: 'all' }) },
  };
  global.User = { qm: { getByIds: async (ids) => ids.map((id) => ({ id, name: `User ${id}` })) } };
  global.sails = {
    getDatastore: () => ({
      transaction: async (callback) => {
        const db = { locked: false, committed: false };
        state.transactions.push(db);
        try {
          const result = await callback(db);
          db.committed = true;
          if (state.transactions.length === 1 && state.afterMutationCommit) {
            state.afterMutationCommit();
          }
          return result;
        } finally {
          db.locked = false;
        }
      },
    }),
    sendNativeQuery: (sql) => ({
      usingConnection: async (db) => {
        if (sql.includes('pg_advisory_xact_lock')) {
          db.locked = true;
          return { rows: [] };
        }
        return { rows: [{ id: '100' }] };
      },
    }),
    helpers: {
      chat: {
        getProjectMemberUserIds: async () => state.memberUserIds,
        getConversationAccess: (conversation, user) => accessHelper.fn({ conversation, user }),
      },
      users: { presentMany: (users) => users },
    },
    sockets: {
      removeRoomMembersFromRooms: (source, target, callback) => callback(),
      broadcast: (room, event, payload) => {
        expect(state.transactions[state.transactions.length - 1].locked).to.equal(true);
        if (state.transactions.length > 1) expect(state.transactions[0].committed).to.equal(true);
        state.events.push({ room, event, payload: clone(payload) });
      },
    },
  };
  return state;
};

describe('Fresh lifecycle publication after commit', () => {
  const globalNames = ['sails', 'ChatConversation', 'ChatParticipant', 'Project', 'User'];
  let previousGlobals;
  beforeEach(() => {
    previousGlobals = new Map(globalNames.map((name) => [name, global[name]]));
  });
  afterEach(() => {
    previousGlobals.forEach((value, name) => {
      if (value === undefined) delete global[name];
      else global[name] = value;
    });
  });

  [
    ['leave', leave, { id: '1' }, '4'],
    ['remove', remove, { conversationId: '1', userId: '4' }, '3'],
  ].forEach(([name, controller, inputs, actorId]) => {
    it(`${name}: publishes active state if the target reentered before publication`, async () => {
      const state = setup();
      state.afterMutationCommit = () => {
        state.participants[1].leftAt = null;
        state.participants[1].leftReason = null;
      };
      const response = await controller.fn.call({ req: { currentUser: { id: actorId } } }, inputs);
      expect(response.item.leftAt).not.to.equal(null);
      expect(response.item.leftReason).to.equal(name === 'leave' ? 'left' : 'removed');
      expect(state.transactions).to.have.length(2);
      const event = state.events.find(({ room }) => room === '@user:4');
      expect(event.payload.item).to.include({ canWrite: true, isHistorical: false });
      expect(
        event.payload.included.chatParticipants.find(({ userId }) => userId === '4').leftAt,
      ).to.equal(null);
    });
  });

  it('does not publish a stale active snapshot to another member who has since left', async () => {
    const state = setup();
    state.afterMutationCommit = () => {
      state.participants[2].leftAt = 'later';
    };
    await leave.fn.call({ req: { currentUser: { id: '4' } } }, { id: '1' });
    expect(state.events.map(({ room }) => room)).to.have.members(['@user:3', '@user:4']);
    expect(state.events.find(({ room }) => room === '@user:3').payload.item.canWrite).to.equal(
      false,
    );
    expect(state.events.find(({ room }) => room === '@user:4').payload.item.isHistorical).to.equal(
      true,
    );
  });

  it('re-add preserves users and response shape, but publication uses the current participants', async () => {
    const state = setup();
    state.participants[1].leftAt = 'earlier';
    state.afterMutationCommit = () => {
      state.participants[2].leftAt = 'later';
    };
    const response = await add.fn.call(
      { req: { currentUser: { id: '3' } } },
      { conversationId: '1', userIds: ['4'] },
    );
    expect(response).to.have.keys('item', 'included');
    expect(response.included.users).to.deep.equal([{ id: '4', name: 'User 4' }]);
    expect(response.included.chatParticipants).to.have.length(3);
    expect(state.events.map(({ room }) => room)).to.have.members(['@user:3', '@user:4']);
    state.events.forEach(({ payload }) => {
      expect(payload.included.users).to.deep.equal(response.included.users);
      expect(payload.included.chatParticipants.map(({ userId }) => userId)).to.have.members([
        '3',
        '4',
      ]);
    });
  });

  it('rename publishes only after commit and uses a subsequent committed title and membership', async () => {
    const state = setup();
    state.afterMutationCommit = () => {
      expect(state.events).to.have.length(0);
      state.conversation.title = 'Newer rename';
      state.participants[1].leftAt = 'later';
    };
    const response = await rename.fn.call(
      { req: { currentUser: { id: '3' } } },
      { id: '1', title: 'Requested rename' },
    );
    expect(response.item.title).to.equal('Requested rename');
    expect(state.transactions).to.have.length(2);
    expect(state.events.map(({ room }) => room)).to.have.members(['@user:3', '@user:5']);
    state.events.forEach(({ payload }) => expect(payload.item.title).to.equal('Newer rename'));
  });

  it('rejects publication to hidden history and users without current project access', async () => {
    const state = setup();
    state.participants[1].leftAt = 'earlier';
    state.participants[1].historyHiddenAt = 'hidden';
    state.memberUserIds = ['3'];
    await publishCurrentConversationState('1', { historicalUserIds: ['4', '5'] });
    expect(state.events.map(({ room }) => room)).to.deep.equal(['@user:3']);
  });

  it('publishes archived historical state only to the explicitly affected former member', async () => {
    const state = setup();
    state.conversation.archivedAt = 'archived';
    state.participants.forEach((p) => {
      p.leftAt = 'earlier';
    });
    await publishCurrentConversationState('1', { historicalUserIds: ['4'] });
    expect(state.events).to.have.length(1);
    expect(state.events[0].room).to.equal('@user:4');
    expect(state.events[0].payload.item).to.include({
      archivedAt: 'archived',
      canWrite: false,
      isHistorical: true,
    });
  });

  it('emits no update when the mutation fails', async () => {
    const state = setup();
    let error;
    try {
      await rename.fn.call({ req: { currentUser: { id: '4' } } }, { id: '1', title: 'Denied' });
    } catch (caught) {
      error = caught;
    }
    expect(error).to.have.property('notEnoughRights');
    expect(state.events).to.have.length(0);
    expect(state.transactions).to.have.length(1);
  });
});
