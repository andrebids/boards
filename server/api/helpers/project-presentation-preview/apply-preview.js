/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    presentationId: {
      type: 'string',
      required: true,
    },
    sourceFilename: {
      type: 'string',
      required: true,
    },
    preview: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const presentation = await ProjectPresentation.qm.getOneById(inputs.presentationId);
    const documentData = presentation && presentation.documentData;
    if (!documentData || documentData.filename !== inputs.sourceFilename) {
      return null;
    }

    const nextDocumentData = {
      ...documentData,
      preview: inputs.preview,
    };
    const result = await sails.sendNativeQuery(
      `UPDATE project_presentation
       SET document_data = $3::jsonb
       WHERE id = $1
         AND document_data->>'filename' = $2
       RETURNING id`,
      [presentation.id, inputs.sourceFilename, JSON.stringify(nextDocumentData)],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const updatedPresentation = await ProjectPresentation.qm.getOneById(presentation.id);
    sails.sockets.broadcast(
      `projectPresentation:${updatedPresentation.id}`,
      'projectPresentationUpdate',
      {
        item: _.omit(updatedPresentation, ['cryptpadEditKey', 'cryptpadViewKey']),
      },
    );

    return updatedPresentation;
  },
};
