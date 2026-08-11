/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    recordOrRecords: {
      type: 'ref',
      required: true,
    },
    connection: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    let cardIdOrIds;
    if (_.isPlainObject(inputs.recordOrRecords)) {
      ({
        recordOrRecords: { id: cardIdOrIds },
      } = inputs);
    } else if (_.every(inputs.recordOrRecords, _.isPlainObject)) {
      cardIdOrIds = sails.helpers.utils.mapRecords(inputs.recordOrRecords);
    }

    const usingConnection = (query) =>
      inputs.connection ? query.usingConnection(inputs.connection) : query;

    await usingConnection(
      CardSubscription.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    await usingConnection(
      CardMembership.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    await usingConnection(
      CardLabel.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    const taskLists = await usingConnection(
      TaskList.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    await sails.helpers.taskLists.deleteRelated.with({
      recordOrRecords: taskLists,
      connection: inputs.connection,
    });

    const { fileReferences } = await sails.models.attachment.qm.delete(
      {
        cardId: cardIdOrIds,
      },
      { connection: inputs.connection },
    );

    const customFieldGroups = await usingConnection(
      CustomFieldGroup.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    await sails.helpers.customFieldGroups.deleteRelated.with({
      recordOrRecords: customFieldGroups,
      connection: inputs.connection,
    });

    await usingConnection(
      Comment.destroy({
        cardId: cardIdOrIds,
      }).fetch(),
    );

    await usingConnection(
      Action.qm.delete({
        cardId: cardIdOrIds,
      }),
    );

    if (!inputs.connection) {
      sails.helpers.attachments.removeUnreferencedFiles(fileReferences);
    }

    return { fileReferences };
  },
};
