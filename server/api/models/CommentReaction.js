/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'comment_reaction',

  attributes: {
    emoji: {
      type: 'string',
      required: true,
      maxLength: 32,
    },
    commentId: {
      model: 'Comment',
      required: true,
      columnName: 'comment_id',
    },
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
  },
};
