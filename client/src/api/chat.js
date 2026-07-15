/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';
import socket from './socket';

const transformDates = (item, fields) =>
  fields.reduce(
    (result, field) => ({
      ...result,
      ...(item[field] && { [field]: new Date(item[field]) }),
    }),
    { ...item },
  );

export const transformChatMessage = (message) => ({
  ...transformDates(message, ['createdAt', 'updatedAt', 'editedAt', 'deletedAt']),
  ...(message.replyTo && {
    replyTo: transformDates(message.replyTo, ['deletedAt']),
  }),
});

export const transformChatConversation = (conversation) => ({
  ...transformDates(conversation, ['createdAt', 'updatedAt', 'lastMessageAt']),
  ...(conversation.lastMessage && {
    lastMessage: transformChatMessage(conversation.lastMessage),
  }),
});

export const transformChatInboxItem = (item) => ({
  ...transformDates(item, ['createdAt', 'updatedAt', 'lastMessageAt', 'lastReadAt', 'mutedUntil']),
  conversationId: item.conversationId || item.id,
  ...(item.lastMessage && {
    lastMessage: transformChatMessage(item.lastMessage),
  }),
});

export const transformChatParticipant = (participant) =>
  transformDates(participant, ['createdAt', 'updatedAt', 'lastReadAt', 'mutedUntil']);

const transformIncluded = (included) => ({
  ...included,
  ...(included?.chatParticipants && {
    chatParticipants: included.chatParticipants.map(transformChatParticipant),
  }),
});

const getChatMembers = (projectId, headers) =>
  socket.get(`/projects/${projectId}/chat-members`, undefined, headers);

const getChatInbox = (headers) =>
  socket.get('/chat-inbox', undefined, headers).then((body) => ({
    ...body,
    items: (body.items || []).map(transformChatInboxItem),
  }));

const markAllChatInboxAsRead = (conversationIds, headers) =>
  socket.post('/chat-inbox/read', { conversationIds }, headers).then((body) => ({
    ...body,
    items: (body.items || (body.item ? [body.item] : [])).map((item) =>
      transformDates(item, ['lastReadAt']),
    ),
  }));

const getChatConversations = (projectId, headers) =>
  socket.get(`/projects/${projectId}/chat-conversations`, undefined, headers).then((body) => ({
    ...body,
    items: body.items.map(transformChatConversation),
    included: transformIncluded(body.included),
  }));

const createGeneralChatConversation = (projectId, headers) =>
  socket
    .post(`/projects/${projectId}/chat-conversations/general`, undefined, headers)
    .then((body) => ({
      ...body,
      item: transformChatConversation(body.item),
      included: transformIncluded(body.included),
    }));

const createDirectChatConversation = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/chat-conversations/direct`, data, headers).then((body) => ({
    ...body,
    item: transformChatConversation(body.item),
    included: transformIncluded(body.included),
  }));

const createCustomChatGroup = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/chat-conversations/groups`, data, headers).then((body) => ({
    ...body,
    item: transformChatConversation(body.item),
    included: transformIncluded(body.included),
  }));

const updateChatConversation = (id, data, headers) =>
  socket.patch(`/chat-conversations/${id}`, data, headers).then((body) => ({
    ...body,
    item: transformChatConversation(body.item),
  }));

const addChatConversationParticipants = (id, userIds, headers) =>
  socket.post(`/chat-conversations/${id}/participants`, { userIds }, headers).then((body) => ({
    ...body,
    item: transformChatConversation(body.item),
    included: transformIncluded(body.included),
  }));

const deleteChatConversationParticipant = (id, userId, headers) =>
  socket.delete(`/chat-conversations/${id}/participants/${userId}`, undefined, headers);

const leaveChatConversation = (id, headers) =>
  socket.post(`/chat-conversations/${id}/leave`, undefined, headers);

const updateChatConversationPreferences = (id, data, headers) =>
  socket.patch(`/chat-conversations/${id}/preferences`, data, headers).then((body) => ({
    ...body,
    item: transformChatParticipant(body.item),
  }));

const updateChatTyping = (id, isTyping, headers) =>
  socket.post(`/chat-conversations/${id}/typing`, { isTyping }, headers);

const getChatMessages = (conversationId, data, headers) =>
  socket.get(`/chat-conversations/${conversationId}/messages`, data, headers).then((body) => ({
    ...body,
    items: body.items.map(transformChatMessage),
  }));

const subscribeToChatConversation = (conversationId, headers) =>
  socket.post(`/chat-conversations/${conversationId}/subscribe`, undefined, headers);

const unsubscribeFromChatConversation = (conversationId, headers) =>
  socket.delete(`/chat-conversations/${conversationId}/subscribe`, undefined, headers);

const createChatMessage = (conversationId, data, headers) =>
  socket.post(`/chat-conversations/${conversationId}/messages`, data, headers).then((body) => ({
    ...body,
    item: transformChatMessage(body.item),
  }));

const createChatMessageAttachment = (messageId, { file }, headers) =>
  http
    .post(`/chat-messages/${messageId}/attachments`, { file }, headers)
    .then((body) => ({ ...body, item: transformChatMessage(body.item) }));

const createChatDiagnostic = (data, headers) => http.post('/chat-diagnostics', data, headers);

const toggleChatMessageReaction = (messageId, emoji, headers) =>
  socket.post(`/chat-messages/${messageId}/reactions`, { emoji }, headers).then((body) => ({
    ...body,
    item: transformChatMessage(body.item),
  }));

const updateChatMessage = (id, data, headers) =>
  socket.patch(`/chat-messages/${id}`, data, headers).then((body) => ({
    ...body,
    item: transformChatMessage(body.item),
  }));

const deleteChatMessage = (id, headers) =>
  socket.delete(`/chat-messages/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformChatMessage(body.item),
  }));

const forwardChatMessage = (id, data, headers) =>
  socket.post(`/chat-messages/${id}/forward`, data, headers).then((body) => ({
    ...body,
    item: transformChatMessage(body.item),
  }));

const markChatConversationAsRead = (conversationId, data, headers) =>
  socket.post(`/chat-conversations/${conversationId}/read`, data, headers).then((body) => ({
    ...body,
    item: transformDates(body.item, ['lastReadAt']),
  }));

const makeHandleChatConversationCreate = (next) => (body) => {
  next({
    ...body,
    item: transformChatConversation(body.item),
    included: transformIncluded(body.included),
  });
};

const makeHandleChatConversationUpdate = makeHandleChatConversationCreate;

const makeHandleChatMessageCreate = (next) => (body) => {
  next({
    ...body,
    item: transformChatMessage(body.item),
  });
};

const makeHandleChatMessageUpdate = makeHandleChatMessageCreate;
const makeHandleChatMessageDelete = makeHandleChatMessageCreate;

const makeHandleChatConversationRead = (next) => (body) => {
  next({
    ...body,
    item: transformDates(body.item, ['lastReadAt']),
  });
};

const makeHandleChatParticipantUpdate = (next) => (body) => {
  next({ ...body, item: transformChatParticipant(body.item) });
};

export default {
  getChatInbox,
  markAllChatInboxAsRead,
  getChatMembers,
  getChatConversations,
  createGeneralChatConversation,
  createDirectChatConversation,
  createCustomChatGroup,
  updateChatConversation,
  addChatConversationParticipants,
  deleteChatConversationParticipant,
  leaveChatConversation,
  updateChatConversationPreferences,
  updateChatTyping,
  getChatMessages,
  subscribeToChatConversation,
  unsubscribeFromChatConversation,
  createChatMessage,
  createChatMessageAttachment,
  createChatDiagnostic,
  toggleChatMessageReaction,
  updateChatMessage,
  deleteChatMessage,
  forwardChatMessage,
  markChatConversationAsRead,
  makeHandleChatConversationCreate,
  makeHandleChatConversationUpdate,
  makeHandleChatMessageCreate,
  makeHandleChatMessageUpdate,
  makeHandleChatMessageDelete,
  makeHandleChatConversationRead,
  makeHandleChatParticipantUpdate,
};
