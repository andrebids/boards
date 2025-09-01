/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * Action.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const Types = {
  CREATE_CARD: 'createCard',
  MOVE_CARD: 'moveCard',
  ADD_MEMBER_TO_CARD: 'addMemberToCard',
  REMOVE_MEMBER_FROM_CARD: 'removeMemberFromCard',
  COMPLETE_TASK: 'completeTask',
  UNCOMPLETE_TASK: 'uncompleteTask',
  CREATE_TASK: 'createTask',
  DELETE_TASK: 'deleteTask',
  UPDATE_TASK: 'updateTask',
  CREATE_TASK_LIST: 'createTaskList',
  DELETE_TASK_LIST: 'deleteTaskList',
  CREATE_ATTACHMENT: 'createAttachment',
  DELETE_ATTACHMENT: 'deleteAttachment',
  SET_DUE_DATE: 'setDueDate',
  // NOVOS TIPOS DE ATIVIDADE PARA COMENTÁRIOS
  COMMENT_CREATE: 'commentCreate',
  COMMENT_UPDATE: 'commentUpdate',
  COMMENT_DELETE: 'commentDelete',
  COMMENT_REPLY: 'commentReply',
  // NOVOS TIPOS DE ATIVIDADE PARA LABELS
  ADD_LABEL_TO_CARD: 'addLabelToCard',
  REMOVE_LABEL_FROM_CARD: 'removeLabelFromCard',
};

const INTERNAL_NOTIFIABLE_TYPES = [Types.MOVE_CARD, Types.ADD_MEMBER_TO_CARD, Types.COMMENT_CREATE, Types.COMMENT_UPDATE, Types.COMMENT_DELETE, Types.ADD_LABEL_TO_CARD, Types.REMOVE_LABEL_FROM_CARD];
const EXTERNAL_NOTIFIABLE_TYPES = [Types.CREATE_CARD, Types.MOVE_CARD, Types.COMMENT_CREATE, Types.ADD_LABEL_TO_CARD];
const PERSONAL_NOTIFIABLE_TYPES = [Types.ADD_MEMBER_TO_CARD, Types.COMMENT_CREATE, Types.COMMENT_UPDATE];

module.exports = {
  Types,
  INTERNAL_NOTIFIABLE_TYPES,
  EXTERNAL_NOTIFIABLE_TYPES,
  PERSONAL_NOTIFIABLE_TYPES,

  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    type: {
      type: 'string',
      isIn: Object.values(Types),
      required: true,
    },
    data: {
      type: 'json',
      required: true,
    },

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    boardId: {
      model: 'Board',
      columnName: 'board_id',
    },
    cardId: {
      model: 'Card',
      required: true,
      columnName: 'card_id',
    },
    userId: {
      model: 'User',
      columnName: 'user_id',
    },
  },
};
