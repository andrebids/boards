/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => FileReference.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => {
  return FileReference.create({ ...values }).fetch();
};

const getByIds = (ids) => defaultFind(ids);

const getOneById = (id) => {
  return FileReference.findOne({ id });
};

const getByTotal = (total) => {
  return defaultFind({ total });
};

const getOrphaned = () => {
  return defaultFind({ total: 0 });
};

const getReferenced = () => {
  return defaultFind({ total: { '>': 0 } });
};

const updateOne = (criteria, values) => {
  return FileReference.updateOne(criteria).set({ ...values });
};

const incrementTotal = (id, increment = 1) => {
  return sails.getDatastore().transaction(async (db) => {
    const queryResult = await sails
      .sendNativeQuery(
        'UPDATE file_reference SET total = total + $1, updated_at = $2 WHERE id = $3 AND total IS NOT NULL RETURNING *',
        [increment, new Date().toISOString(), id]
      )
      .usingConnection(db);

    if (queryResult.rowCount === 0) {
      throw 'fileReferenceNotFound';
    }

    return queryResult.rows[0];
  });
};

const decrementTotal = (id, decrement = 1) => {
  return sails.getDatastore().transaction(async (db) => {
    const queryResult = await sails
      .sendNativeQuery(
        'UPDATE file_reference SET total = GREATEST(0, total - $1), updated_at = $2 WHERE id = $3 AND total IS NOT NULL RETURNING *',
        [decrement, new Date().toISOString(), id]
      )
      .usingConnection(db);

    if (queryResult.rowCount === 0) {
      throw 'fileReferenceNotFound';
    }

    return queryResult.rows[0];
  });
};

const deleteOne = (criteria) => {
  return FileReference.destroyOne(criteria);
};

const deleteOrphaned = () => {
  return FileReference.destroy({ total: 0 });
};

const cleanupOrphaned = () => {
  return sails.getDatastore().transaction(async (db) => {
    // Buscar referências órfãs (total = 0)
    const orphanedRefs = await FileReference.find({ total: 0 }).usingConnection(db);
    
    if (orphanedRefs.length === 0) {
      return { deleted: 0, message: 'Nenhuma referência órfã encontrada' };
    }

    // Deletar referências órfãs
    const deletedCount = await FileReference.destroy({ total: 0 }).usingConnection(db);

    return {
      deleted: deletedCount,
      message: `${deletedCount} referência(s) órfã(s) removida(s)`,
      orphanedIds: orphanedRefs.map(ref => ref.id)
    };
  });
};

const getStats = () => {
  return sails.getDatastore().transaction(async (db) => {
    const stats = await sails
      .sendNativeQuery(`
        SELECT 
          COUNT(*) as total_references,
          COUNT(CASE WHEN total = 0 THEN 1 END) as orphaned_references,
          COUNT(CASE WHEN total > 0 THEN 1 END) as referenced_files,
          COALESCE(SUM(total), 0) as total_attachments
        FROM file_reference
      `)
      .usingConnection(db);

    return stats.rows[0];
  });
};

module.exports = {
  createOne,
  getByIds,
  getOneById,
  getByTotal,
  getOrphaned,
  getReferenced,
  updateOne,
  incrementTotal,
  decrementTotal,
  deleteOne,
  deleteOrphaned,
  cleanupOrphaned,
  getStats,
};
