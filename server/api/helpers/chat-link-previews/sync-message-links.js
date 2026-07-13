/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const READY_TTL = 24 * 60 * 60 * 1000;
const FAILED_TTL = 60 * 60 * 1000;

module.exports = {
  inputs: {
    message: { type: 'ref', required: true },
    projectId: { type: 'string', required: true },
  },

  async fn(inputs) {
    if (!sails.config.custom.chatExternalLinkPreviewsEnabled || inputs.message.deletedAt) {
      await ChatMessageLinkPreview.qm.replaceForMessage(inputs.message.id, []);
      return;
    }

    const urls = sails.helpers.chatLinkPreviews.extractUrls(inputs.message.text || '');
    const previews = await Promise.all(
      urls.map(async (urlData) => {
        let preview = await ChatLinkPreview.qm.getOneByProjectIdAndNormalizedUrl(
          inputs.projectId,
          urlData.normalizedUrl,
        );
        if (!preview) {
          try {
            preview = await ChatLinkPreview.qm.createOne({
              projectId: inputs.projectId,
              ...urlData,
              status: ChatLinkPreview.Statuses.PENDING,
            });
          } catch (error) {
            if (error.code !== 'E_UNIQUE') {
              throw error;
            }
            preview = await ChatLinkPreview.qm.getOneByProjectIdAndNormalizedUrl(
              inputs.projectId,
              urlData.normalizedUrl,
            );
          }
        }
        return preview;
      }),
    );

    await ChatMessageLinkPreview.qm.replaceForMessage(
      inputs.message.id,
      previews.map(({ id }) => id),
    );

    previews.forEach((preview) => {
      const isExpired = !preview.expiresAt || new Date(preview.expiresAt) <= new Date();
      if (!isExpired && preview.status !== ChatLinkPreview.Statuses.PENDING) {
        return;
      }
      setImmediate(async () => {
        let values;
        try {
          const metadata = await sails.helpers.chatLinkPreviews.fetchMetadata(preview.url);
          values = {
            ...metadata,
            status: ChatLinkPreview.Statuses.READY,
            fetchedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + READY_TTL).toISOString(),
            failureReason: null,
          };
        } catch (error) {
          values = {
            status:
              error === 'blocked'
                ? ChatLinkPreview.Statuses.BLOCKED
                : ChatLinkPreview.Statuses.FAILED,
            fetchedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + FAILED_TTL).toISOString(),
            failureReason: error === 'blocked' ? 'blocked' : 'fetchFailed',
          };
        }
        await ChatLinkPreview.qm.updateOne(preview.id, values);
        const currentMessage = await ChatMessage.qm.getOneById(inputs.message.id);
        if (!currentMessage || currentMessage.deletedAt) {
          return;
        }
        const extras = await sails.helpers.chat.getMessageExtras([currentMessage.id]);
        sails.sockets.broadcast(
          `chatConversation:${currentMessage.conversationId}`,
          'chatMessageUpdate',
          {
            item: sails.helpers.chat.presentMessage({
              ...currentMessage,
              ...extras[currentMessage.id],
            }),
          },
        );
      });
    });
  },
};
