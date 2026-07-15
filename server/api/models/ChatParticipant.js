/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const NotificationLevels = {
  ALL: 'all',
  MENTIONS: 'mentions',
  NONE: 'none',
};

const Roles = {
  OWNER: 'owner',
  MEMBER: 'member',
};

const isMuted = (participant, now = Date.now()) => {
  if (participant.notificationLevel === NotificationLevels.NONE) {
    return true;
  }

  if (!participant.mutedUntil) {
    return false;
  }

  const expiration = new Date(participant.mutedUntil).getTime();
  const currentTime = now instanceof Date ? now.getTime() : Number(now);

  return Number.isFinite(expiration) && Number.isFinite(currentTime) && expiration > currentTime;
};

module.exports = {
  NotificationLevels,
  Roles,
  isMuted,

  customToJSON() {
    const participant = { ...this };
    delete participant.toJSON;

    return {
      ...participant,
      isMuted: isMuted(this),
    };
  },

  tableName: 'chat_participant',

  attributes: {
    lastReadAt: {
      type: 'ref',
      columnName: 'last_read_at',
    },
    isMuted: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'is_muted',
    },
    notificationLevel: {
      type: 'string',
      isIn: Object.values(NotificationLevels),
      defaultsTo: NotificationLevels.ALL,
      columnName: 'notification_level',
    },
    mutedUntil: {
      type: 'ref',
      columnName: 'muted_until',
    },
    role: {
      type: 'string',
      isIn: Object.values(Roles),
      defaultsTo: Roles.MEMBER,
    },
    conversationId: {
      model: 'ChatConversation',
      required: true,
      columnName: 'conversation_id',
    },
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
    lastReadMessageId: {
      model: 'ChatMessage',
      columnName: 'last_read_message_id',
    },
  },
};
