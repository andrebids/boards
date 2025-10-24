/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Query methods for ExpenseAttachment

const defaultFind = (criteria) => ExpenseAttachment.find(criteria).sort('id');

/* Create many */
const create = (arrayOfValues) => {
  const arrayOfFileValues = arrayOfValues.filter(({ type }) => type === ExpenseAttachment.Types.FILE);

  if (arrayOfFileValues.length > 0) {
    const arrayOfValuesByFileReferenceId = _.groupBy(arrayOfFileValues, 'data.fileReferenceId');

    const fileReferenceIds = Object.keys(arrayOfValuesByFileReferenceId);

    const fileReferenceIdsByTotal = Object.entries(arrayOfValuesByFileReferenceId).reduce(
      (result, [fileReferenceId, arrayOfValuesItem]) => ({
        ...result,
        [arrayOfValuesItem.length]: [...(result[arrayOfValuesItem.length] || []), fileReferenceId],
      }),
      {},
    );

    return sails.getDatastore().transaction(async (db) => {
      const queryValues = [];
      let query = `UPDATE file_reference SET total = total + CASE `;

      Object.entries(fileReferenceIdsByTotal).forEach(([total, fileReferenceIdsItem]) => {
        const inValues = fileReferenceIdsItem.map((fileReferenceId) => {
          queryValues.push(fileReferenceId);
          return `$${queryValues.length}`;
        });

        queryValues.push(total);
        query += `WHEN id IN (${inValues.join(', ')}) THEN $${queryValues.length}::int `;
      });

      const inValues = fileReferenceIds.map((fileReferenceId) => {
        queryValues.push(fileReferenceId);
        return `$${queryValues.length}`;
      });

      queryValues.push(new Date().toISOString());
      query += `END, updated_at = $${queryValues.length} WHERE id IN (${inValues.join(', ')}) AND total IS NOT NULL`;

      await sails.sendNativeQuery(query, queryValues).usingConnection(db);

      return ExpenseAttachment.createEach(arrayOfValues).fetch().usingConnection(db);
    });
  }

  return ExpenseAttachment.createEach(arrayOfValues).fetch();
};

/* Create one */
const createOne = (values) => {
  if (values.type === ExpenseAttachment.Types.FILE) {
    const { fileReferenceId } = values.data;

    return sails.getDatastore().transaction(async (db) => {
      const attachment = await ExpenseAttachment.create({ ...values }).fetch().usingConnection(db);

      const queryResult = await sails
        .sendNativeQuery(
          'UPDATE file_reference SET total = total + 1, updated_at = $1 WHERE id = $2 AND total IS NOT NULL',
          [new Date().toISOString(), fileReferenceId],
        )
        .usingConnection(db);

      if (queryResult.rowCount === 0) {
        throw 'fileReferenceNotFound';
      }

      return attachment;
    });
  }

  return ExpenseAttachment.create({ ...values }).fetch();
};

const getByIds = (ids) => defaultFind({ id: ids });
const getByExpenseId = (expenseId) => defaultFind({ expenseId });
const getOneById = (id) => ExpenseAttachment.findOne({ id });

const update = (criteria, values) => ExpenseAttachment.update(criteria).set({ ...values }).fetch();
const updateOne = (criteria, values) => ExpenseAttachment.updateOne(criteria).set({ ...values });

/* Delete many */
const delete_ = (criteria) =>
  sails.getDatastore().transaction(async (db) => {
    const attachments = await ExpenseAttachment.destroy(criteria).fetch().usingConnection(db);
    const fileAttachments = attachments.filter(({ type }) => type === ExpenseAttachment.Types.FILE);

    let fileReferences = [];
    if (fileAttachments.length > 0) {
      const attachmentsByFileReferenceId = _.groupBy(fileAttachments, 'data.fileReferenceId');

      const fileReferenceIdsByTotal = Object.entries(attachmentsByFileReferenceId).reduce(
        (result, [fileReferenceId, attachmentsItem]) => ({
          ...result,
          [attachmentsItem.length]: [...(result[attachmentsItem.length] || []), fileReferenceId],
        }),
        {},
      );

      const queryValues = [];
      let query = 'UPDATE file_reference SET total = CASE WHEN total = CASE ';

      Object.entries(fileReferenceIdsByTotal).forEach(([total, fileReferenceIds]) => {
        const inValues = fileReferenceIds.map((fileReferenceId) => {
          queryValues.push(fileReferenceId);
          return `$${queryValues.length}`;
        });

        queryValues.push(total);
        query += `WHEN id IN (${inValues.join(', ')}) THEN $${queryValues.length}::int `;
      });

      query += 'END THEN NULL ELSE total - CASE ';

      Object.entries(fileReferenceIdsByTotal).forEach(([total, fileReferenceIds]) => {
        const inValues = fileReferenceIds.map((fileReferenceId) => {
          queryValues.push(fileReferenceId);
          return `$${queryValues.length}`;
        });

        queryValues.push(total);
        query += `WHEN id IN (${inValues.join(', ')}) THEN $${queryValues.length}::int `;
      });

      const inValues = Object.keys(attachmentsByFileReferenceId).map((fileReferenceId) => {
        queryValues.push(fileReferenceId);
        return `$${queryValues.length}`;
      });

      queryValues.push(new Date().toISOString());
      query += `END, updated_at = $${queryValues.length} WHERE id IN (${inValues.join(', ')}) RETURNING id, total`;

      const queryResult = await sails.sendNativeQuery(query, queryValues).usingConnection(db);
      fileReferences = queryResult.rows;
    }

    return {
      attachments,
      fileReferences,
    };
  });

/* Delete one */
const deleteOne = (criteria, { isFile = true } = {}) => {
  let fileReference = null;

  if (isFile) {
    return sails.getDatastore().transaction(async (db) => {
      const attachment = await ExpenseAttachment.destroyOne(criteria).usingConnection(db);

      if (attachment && attachment.type === ExpenseAttachment.Types.FILE) {
        const queryResult = await sails
          .sendNativeQuery(
            'UPDATE file_reference SET total = CASE WHEN total > 1 THEN total - 1 END, updated_at = $1 WHERE id = $2 RETURNING id, total',
            [new Date().toISOString(), attachment.data.fileReferenceId],
          )
          .usingConnection(db);

        [fileReference] = queryResult.rows;
      }

      return {
        attachment,
        fileReference,
      };
    });
  }

  return sails.getDatastore().transaction(async (db) => {
    const attachment = await ExpenseAttachment.destroyOne(criteria).usingConnection(db);
    return {
      attachment,
      fileReference,
    };
  });
};

module.exports = {
  create,
  createOne,
  getByIds,
  getByExpenseId,
  getOneById,
  update,
  updateOne,
  deleteOne,
  delete: delete_,
};


