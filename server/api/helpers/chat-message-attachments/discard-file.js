/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    fileReferenceId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const fileReference = await FileReference.findOne({
      id: inputs.fileReferenceId,
      total: 0,
    });

    if (!fileReference) {
      return false;
    }

    const fileManager = sails.hooks['file-manager'].getInstance();

    try {
      await fileManager.deleteDir(
        `${sails.config.custom.attachmentsPathSegment}/${fileReference.id}`,
      );
    } catch (error) {
      sails.log.error('Failed to discard an unreferenced chat attachment file', {
        fileReferenceId: fileReference.id,
        error: error.message,
      });

      return false;
    }

    const deletedFileReference = await FileReference.destroyOne({
      id: fileReference.id,
      total: 0,
    });

    return Boolean(deletedFileReference);
  },
};
