/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const getByMessageIds = (messageIds) =>
  messageIds.length > 0
    ? ChatMessageLinkPreview.find({ messageId: messageIds }).sort('position')
    : [];

const replaceForMessage = async (messageId, linkPreviewIds) => {
  await ChatMessageLinkPreview.destroy({ messageId });
  if (linkPreviewIds.length === 0) {
    return [];
  }
  return ChatMessageLinkPreview.createEach(
    linkPreviewIds.map((linkPreviewId, position) => ({
      messageId,
      linkPreviewId,
      position,
    })),
  ).fetch();
};

module.exports = {
  getByMessageIds,
  replaceForMessage,
};
