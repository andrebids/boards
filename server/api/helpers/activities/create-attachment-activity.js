/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    attachment: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    user: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    action: {
      type: 'string',
      isIn: ['create', 'delete'],
      required: true,
    },
    request: {
      type: 'ref',
      required: false,
    },
  },

  async fn(inputs) {
    const { attachment, card, user, board, action } = inputs;

    // Mapear ação para tipo de atividade (seguindo padrão do projeto)
const getActivityType = (action) => {
  switch (action) {
    case 'create': return 'createAttachment';
    case 'delete': return 'deleteAttachment';
    default: return 'createAttachment';
  }
};

    try {
      // Verificar se é um arquivo de vídeo
      var isVideoFile = attachment.data && attachment.data.mimeType && attachment.data.mimeType.startsWith('video/');

      // Criar dados da atividade (seguindo padrão existente)
      const activityData = {
        attachmentId: attachment.id,
        attachmentName: attachment.name,
        cardName: card.name,
        cardId: card.id,
        isVideo: isVideoFile,
        mimeType: attachment.data ? attachment.data.mimeType : null,
        videoData: isVideoFile && attachment.data && attachment.data.video ? {
          duration: attachment.data.video.duration,
          width: attachment.data.video.width,
          height: attachment.data.video.height,
          format: attachment.data.video.format,
          thumbnails: attachment.data.video.thumbnails
        } : null,
        // CORRIGIR: Usar estrutura que o frontend espera (igual ao present-one.js)
        thumbnailUrls: isVideoFile && attachment.data && attachment.data.video && attachment.data.video.thumbnails && attachment.data.video.thumbnails.length > 0 ? {
          // Usar o mesmo formato que o present-one.js para consistência
          outside360: `${sails.config.custom.baseUrl}/attachments/${attachment.id}/download/video-thumbnails/frame-0-360.png`,
          outside720: `${sails.config.custom.baseUrl}/attachments/${attachment.id}/download/video-thumbnails/frame-0-720.png`
        } : null,
        action: action
      };

      // Criar atividade usando padrão existente (igual ao create-comment-activity.js)
      const activity = await Action.create({
        type: getActivityType(action),
        data: activityData,
        boardId: board.id,
        cardId: card.id,
        userId: user.id,
      }).fetch();

      // Enviar atividade via socket para atualização instantânea no frontend
      sails.sockets.broadcast(
        `board:${board.id}`,
        'actionCreate',
        {
          item: activity,
        },
        inputs.request || {}
      );

      return activity;

    } catch (error) {
      throw error;
    }
  },
};
