/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => ChatMessageAttachment.find(criteria).sort('id');

const createOne = (values, { maxAttachmentsPerMessage } = {}) =>
  sails.getDatastore().transaction(async (db) => {
    const messageResult = await sails
      .sendNativeQuery(
        'SELECT id FROM chat_message WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [values.messageId],
      )
      .usingConnection(db);

    if (messageResult.rowCount === 0) {
      throw 'messageNotFound';
    }

    if (maxAttachmentsPerMessage) {
      const countResult = await sails
        .sendNativeQuery(
          'SELECT COUNT(*)::int AS total FROM chat_message_attachment WHERE message_id = $1',
          [values.messageId],
        )
        .usingConnection(db);

      if (countResult.rows[0].total >= maxAttachmentsPerMessage) {
        throw 'attachmentLimitReached';
      }
    }

    const fileReferenceResult = await sails
      .sendNativeQuery(
        `UPDATE file_reference
         SET total = total + 1, updated_at = $1
         WHERE id = $2 AND total IS NOT NULL
         RETURNING id, total`,
        [new Date().toISOString(), values.fileReferenceId],
      )
      .usingConnection(db);

    if (fileReferenceResult.rowCount === 0) {
      throw 'fileReferenceNotFound';
    }

    return ChatMessageAttachment.create({ ...values })
      .fetch()
      .usingConnection(db);
  });

const getByMessageIds = (messageIds) => defaultFind({ messageId: messageIds });

const decrementFileReferenceTotals = async (attachments, db) => {
  if (attachments.length === 0) {
    return [];
  }

  const totalsByFileReferenceId = new Map();

  attachments.forEach((attachment) => {
    const fileReferenceId = attachment.fileReferenceId || attachment.data.fileReferenceId;
    totalsByFileReferenceId.set(
      fileReferenceId,
      (totalsByFileReferenceId.get(fileReferenceId) || 0) + 1,
    );
  });

  const queryValues = [];
  const rows = Array.from(totalsByFileReferenceId).map(([fileReferenceId, total]) => {
    queryValues.push(fileReferenceId, total);
    return `($${queryValues.length - 1}::bigint, $${queryValues.length}::int)`;
  });

  queryValues.push(new Date().toISOString());

  const queryResult = await sails
    .sendNativeQuery(
      `UPDATE file_reference AS file_reference
       SET total = CASE
         WHEN file_reference.total <= removed.total THEN NULL
         ELSE file_reference.total - removed.total
       END,
       updated_at = $${queryValues.length}
       FROM (VALUES ${rows.join(', ')}) AS removed(id, total)
       WHERE file_reference.id = removed.id
         AND file_reference.total IS NOT NULL
       RETURNING file_reference.id, file_reference.total`,
      queryValues,
    )
    .usingConnection(db);

  return queryResult.rows.filter(({ total }) => total === null);
};

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) =>
  sails.getDatastore().transaction(async (db) => {
    const attachments = await ChatMessageAttachment.destroy(criteria).fetch().usingConnection(db);
    const fileReferences = await decrementFileReferenceTotals(attachments, db);

    return {
      attachments,
      fileReferences,
    };
  });

const deleteByMessageId = (messageId) => delete_({ messageId });

const deleteByMessageIds = (messageIds) => {
  if (messageIds.length === 0) {
    return {
      attachments: [],
      fileReferences: [],
    };
  }

  return delete_({ messageId: messageIds });
};

const deleteByProjectIds = (projectIdOrIds) => {
  const projectIds = (Array.isArray(projectIdOrIds) ? projectIdOrIds : [projectIdOrIds]).filter(
    Boolean,
  );

  if (projectIds.length === 0) {
    return {
      fileReferences: [],
    };
  }

  return sails.getDatastore().transaction(async (db) => {
    const queryResult = await sails
      .sendNativeQuery(
        `WITH deleted_attachments AS (
           DELETE FROM chat_message_attachment AS attachment
           USING chat_message AS message, chat_conversation AS conversation
           WHERE attachment.message_id = message.id
             AND message.conversation_id = conversation.id
             AND conversation.project_id = ANY($1::bigint[])
           RETURNING attachment.file_reference_id
         ), removed AS (
           SELECT file_reference_id AS id, COUNT(*)::int AS total
           FROM deleted_attachments
           GROUP BY file_reference_id
         )
         UPDATE file_reference AS file_reference
         SET total = CASE
           WHEN file_reference.total <= removed.total THEN NULL
           ELSE file_reference.total - removed.total
         END,
         updated_at = $2
         FROM removed
         WHERE file_reference.id = removed.id
           AND file_reference.total IS NOT NULL
         RETURNING file_reference.id, file_reference.total`,
        [projectIds, new Date().toISOString()],
      )
      .usingConnection(db);

    return {
      fileReferences: queryResult.rows.filter(({ total }) => total === null),
    };
  });
};

module.exports = {
  createOne,
  getByMessageIds,
  deleteByMessageId,
  deleteByMessageIds,
  deleteByProjectIds,
  delete: delete_,
};
