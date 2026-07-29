/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { extractMentionIds } = require('../../../utils/mentions');

module.exports = {
  inputs: {
    text: {
      type: 'string',
      required: true,
    },
    previousText: {
      type: 'string',
      defaultsTo: '',
    },
    boardId: {
      type: 'string',
      required: true,
    },
    exceptUserIdOrIds: {
      type: 'json',
    },
  },

  async fn(inputs) {
    const previousMentionUserIds = new Set(extractMentionIds(inputs.previousText || ''));
    const excludedUserIds = new Set(
      Array.isArray(inputs.exceptUserIdOrIds)
        ? inputs.exceptUserIdOrIds
        : [inputs.exceptUserIdOrIds].filter(Boolean),
    );

    const candidateUserIds = [
      ...new Set(
        extractMentionIds(inputs.text).filter(
          (userId) => !previousMentionUserIds.has(userId) && !excludedUserIds.has(userId),
        ),
      ),
    ];

    if (candidateUserIds.length === 0) {
      return [];
    }

    const boardMemberUserIds = new Set(await sails.helpers.boards.getMemberUserIds(inputs.boardId));

    return candidateUserIds.filter((userId) => boardMemberUserIds.has(userId));
  },
};
