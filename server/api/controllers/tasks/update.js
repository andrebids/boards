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
  TASK_NOT_FOUND: {
    taskNotFound: 'Task not found',
  },
  TASK_LIST_NOT_FOUND: {
    taskListNotFound: 'Task list not found',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  PARENT_TASK_NOT_FOUND: {
    parentTaskNotFound: 'Parent task not found',
  },
  CONTENT_MUST_NOT_BE_EMPTY: {
    contentMustNotBeEmpty: 'Content must not be empty',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    taskListId: idInput,
    assigneeUserId: {
      ...idInput,
      allowNull: true,
    },
    position: {
      type: 'number',
      min: 0,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
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
    taskNotFound: {
      responseType: 'notFound',
    },
    taskListNotFound: {
      responseType: 'notFound',
    },
    userNotFound: {
      responseType: 'notFound',
    },
    parentTaskNotFound: {
      responseType: 'notFound',
    },
    contentMustNotBeEmpty: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const pathToProject = await sails.helpers.tasks
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.TASK_NOT_FOUND);

    let { task } = pathToProject;
    const { taskList, card, list, board, project } = pathToProject;

    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    if (!boardMembership) {
      throw Errors.TASK_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextTaskList;
    if (!_.isUndefined(inputs.taskListId)) {
      nextTaskList = await TaskList.qm.getOneById(inputs.taskListId, {
        cardId: card.id,
      });

      if (!nextTaskList) {
        throw Errors.TASK_LIST_NOT_FOUND;
      }
    }

    if (!_.isUndefined(inputs.parentTaskId) && inputs.parentTaskId) {
      const parentTask = await Task.qm.getOneById(inputs.parentTaskId, {
        taskListId: (nextTaskList || taskList).id,
      });

      if (!parentTask || parentTask.id === task.id || parentTask.parentTaskId) {
        throw Errors.PARENT_TASK_NOT_FOUND;
      }
    }

    if (inputs.assigneeUserId) {
      const isBoardMember = await sails.helpers.users.isBoardMember(
        inputs.assigneeUserId,
        board.id,
      );

      if (!isBoardMember) {
        throw Errors.USER_NOT_FOUND;
      }
    }

    const values = _.pick(inputs, [
      'assigneeUserId',
      'position',
      'isCompleted',
      'parentTaskId',
    ]);

    if (!_.isUndefined(inputs.content) || !_.isUndefined(inputs.name)) {
      const taskContentValues = getTaskContentValues(inputs);
      if (!taskContentValues) {
        throw Errors.CONTENT_MUST_NOT_BE_EMPTY;
      }

      Object.assign(values, taskContentValues);
    }

    task = await sails.helpers.tasks.updateOne.with({
      project,
      board,
      list,
      card,
      taskList,
      record: task,
      values: {
        ...values,
        taskList: nextTaskList,
      },
      actorUser: currentUser,
      request: this.req,
    });

    if (!task) {
      throw Errors.TASK_NOT_FOUND;
    }

    return {
      item: task,
    };
  },
};
