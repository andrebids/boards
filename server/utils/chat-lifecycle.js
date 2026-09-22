const withConversationLock = (conversationId, callback) =>
  sails.getDatastore().transaction(async (db) => {
    await sails
      .sendNativeQuery('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `chat-conversation:${conversationId}`,
      ])
      .usingConnection(db);

    const conversation = await ChatConversation.findOne(conversationId).usingConnection(db);
    const participants = conversation
      ? await ChatParticipant.find({ conversationId })
          .sort([{ createdAt: 'ASC' }, { id: 'ASC' }])
          .usingConnection(db)
      : [];

    return callback({ db, conversation, participants });
  });

const isActiveParticipant = (participant) => Boolean(participant && !participant.leftAt);

const leaveConversationRooms = (conversationId, userId) =>
  new Promise((resolve, reject) => {
    sails.sockets.removeRoomMembersFromRooms(
      `@user:${userId}`,
      `chatConversation:${conversationId}`,
      (error) => (error ? reject(error) : resolve()),
    );
  });

const joinConversationRoom = (request, conversationId) =>
  new Promise((resolve, reject) => {
    sails.sockets.join(request, `chatConversation:${conversationId}`, (error) =>
      error ? reject(error) : resolve(),
    );
  });

// Called while holding the conversation lock, so a queued mutation cannot use stale access.
const assertConversationWritable = async (conversationId, userId, db) => {
  const conversation = await ChatConversation.findOne(conversationId).usingConnection(db);
  const access =
    conversation &&
    !conversation.archivedAt &&
    (await sails.helpers.chat.getConversationAccess(conversation, { id: userId }));
  if (!access || !access.canWrite) {
    throw Object.assign(new Error('Conversation is blocked'), { code: 'conversationBlocked' });
  }
  return access;
};

const getActiveParticipants = (participants, memberUserIds) =>
  participants.filter(
    (participant) =>
      isActiveParticipant(participant) &&
      (!memberUserIds || memberUserIds.includes(participant.userId)),
  );

// Reacquire after commit: another lifecycle mutation may already have completed.
const publishCurrentConversationState = (conversationId, { historicalUserIds = [], users } = {}) =>
  withConversationLock(conversationId, async ({ conversation, participants }) => {
    if (!conversation) {
      return;
    }
    const targetUserIds = new Set([
      ...getActiveParticipants(participants).map(({ userId }) => userId),
      ...historicalUserIds,
    ]);
    await Promise.all(
      [...targetUserIds].map(async (userId) => {
        const access = await sails.helpers.chat.getConversationAccess(conversation, { id: userId });
        if (!access || (access.isHistorical && !historicalUserIds.includes(userId))) {
          return;
        }
        sails.sockets.broadcast(`@user:${userId}`, 'chatConversationUpdate', {
          item: {
            ...conversation,
            canWrite: access.canWrite,
            isHistorical: access.isHistorical,
          },
          included: {
            chatParticipants: access.isHistorical
              ? [...access.participants, access.participant]
              : access.participants,
            ...(users && { users }),
          },
        });
      }),
    );
  });

const getHistoryUpperBound = async (conversationId, db) => {
  const result = await sails
    .sendNativeQuery(
      `SELECT id
       FROM chat_message
       WHERE conversation_id = $1
       ORDER BY id DESC
       LIMIT 1
       FOR SHARE`,
      [conversationId],
    )
    .usingConnection(db);
  return (result.rows[0] && result.rows[0].id) || null;
};

module.exports = {
  withConversationLock,
  leaveConversationRooms,
  joinConversationRoom,
  assertConversationWritable,
  isActiveParticipant,
  getActiveParticipants,
  publishCurrentConversationState,
  getHistoryUpperBound,
};
