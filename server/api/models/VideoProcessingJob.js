/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'video_processing_job',

  attributes: {
    sourceFilename: {
      type: 'string',
      required: true,
      columnName: 'source_filename',
    },
    status: {
      type: 'string',
      isIn: ['pending', 'processing', 'ready', 'failed'],
      defaultsTo: 'pending',
    },
    attempts: {
      type: 'number',
      defaultsTo: 0,
    },
    scheduledAt: {
      type: 'ref',
      columnName: 'scheduled_at',
    },
    lastError: {
      type: 'string',
      allowNull: true,
      columnName: 'last_error',
    },
    result: {
      type: 'json',
    },
    completedAt: {
      type: 'ref',
      columnName: 'completed_at',
    },
    fileReferenceId: {
      model: 'FileReference',
      required: true,
      unique: true,
      columnName: 'file_reference_id',
    },
  },
};
