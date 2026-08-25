/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');
const { getTaskContentValues } = require('../../../utils/task-content');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  TASK_LIST_NOT_FOUND: {
    taskListNotFound: 'Task list not found',
  },
  CONTENT_MUST_NOT_BE_EMPTY: {
    contentMustNotBeEmpty: 'Content must not be empty',
  },
};

module.exports = {
  inputs: {
    taskListId: {
      ...idInput,
      required: true,
    },
    position: {
      type: 'number',
      min: 0,
      required: true,
    },
    name: {
      type: 'string',
      maxLength: 1024,
    },
    content: {
      type: 'string',
      maxLength: 1048576,
    },
    isCompleted: {
      type: 'boolean',
    },
    parentTaskId: {
      ...idInput,
      allowNull: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    taskListNotFound: {
      responseType: 'notFound',
    },
    contentMustNotBeEmpty: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { taskList, card, list, board, project } = await sails.helpers.taskLists
      .getPathToProjectById(inputs.taskListId)
      .intercept('pathNotFound', () => Errors.TASK_LIST_NOT_FOUND);

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.TASK_LIST_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let parentTask;
    if (inputs.parentTaskId) {
      parentTask = await Task.qm.getOneById(inputs.parentTaskId, {
        taskListId: taskList.id,
      });
      if (!parentTask) {
        throw Errors.TASK_LIST_NOT_FOUND;
      }
    }

    const taskContentValues = getTaskContentValues(inputs);
    if (!taskContentValues) {
      throw Errors.CONTENT_MUST_NOT_BE_EMPTY;
    }

    const values = {
      ..._.pick(inputs, ['position', 'isCompleted', 'parentTaskId']),
      ...taskContentValues,
    };

    const task = await sails.helpers.tasks.createOne.with({
      project,
      board,
      list,
      card,
      values: {
        ...values,
        taskList,
      },
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: task,
    };
  },
};
