/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const CARD_DELETE_MISSED = Symbol('CARD_DELETE_MISSED');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    project: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const taskLists = await TaskList.qm.getByCardId(inputs.record.id);
    const tasks = taskLists.length
      ? await Task.qm.getByTaskListIds(taskLists.map(({ id }) => id))
      : [];
    const linkedGanttItems = tasks.length
      ? await GanttItem.qm.getBySourceTaskIds(tasks.map(({ id }) => id))
      : [];
    let result;
    try {
      result = await sails.getDatastore().transaction(async (db) => {
        const related = await sails.helpers.cards.deleteRelated.with({
          recordOrRecords: inputs.record,
          connection: db,
        });

        const card = await Card.qm.deleteOne(inputs.record.id).usingConnection(db);

        if (!card) {
          throw CARD_DELETE_MISSED;
        }

        return {
          card,
          fileReferences: related.fileReferences,
        };
      });
    } catch (error) {
      if (error === CARD_DELETE_MISSED) {
        return null;
      }

      throw error;
    }

    const { card, fileReferences } = result;

    sails.helpers.attachments.removeUnreferencedFiles(fileReferences);

    if (linkedGanttItems.length > 0) {
      await sails.helpers.gantt.broadcastDetachedItems.with({
        items: linkedGanttItems,
        request: inputs.request,
      });
    }

    if (card) {
      sails.sockets.broadcast(
        `board:${card.boardId}`,
        'cardDelete',
        {
          item: card,
        },
        inputs.request,
      );

      sails.helpers.utils.sendWebhooks.with({
        event: 'cardDelete',
        buildData: () => ({
          item: card,
          included: {
            projects: [inputs.project],
            boards: [inputs.board],
            lists: [inputs.list],
          },
        }),
        user: inputs.actorUser,
      });
    }

    return card;
  },
};
