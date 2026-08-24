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
  },

  async fn(inputs) {
    const presentations = Array.isArray(inputs.recordOrRecords)
      ? inputs.recordOrRecords
      : [inputs.recordOrRecords];
    const fileManager = sails.hooks['file-manager'].getInstance();

    await Promise.all(
      presentations.map(async (presentation) => {
        try {
          await fileManager.deleteDir(
            `${sails.config.custom.attachmentsPathSegment}/project-presentations/${presentation.id}`,
          );
        } catch (error) {
          sails.log.error('Failed to remove project presentation files', {
            presentationId: presentation.id,
            error: error.message,
          });
        }
      }),
    );
  },
};
