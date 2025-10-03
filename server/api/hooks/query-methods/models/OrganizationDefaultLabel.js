/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Cache simples em memória (limpa a cada 5 minutos ou em operações CUD)
let labelsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function clearCache() {
  labelsCache = null;
  cacheTimestamp = null;
}

function isCacheValid() {
  return labelsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL);
}

module.exports = {
  getAll: async (useCache = true) => {
    // Usar cache se disponível e válido
    if (useCache && isCacheValid()) {
      return labelsCache;
    }
    
    const records = await sails.models.organizationdefaultlabel
      .find()
      .sort('position ASC');
    
    // Atualizar cache
    labelsCache = records;
    cacheTimestamp = Date.now();
    
    return records;
  },

  getOneById: async (id) => {
    const record = await sails.models.organizationdefaultlabel.findOne({ id });
    return record || null;
  },

  getOneByName: async (name) => {
    const records = await sails.models.organizationdefaultlabel.find();
    const record = records.find(r => r.name.toLowerCase() === name.toLowerCase());
    return record || null;
  },

  createOne: async (values) => {
    // Validar unicidade (case-insensitive)
    const existing = await module.exports.getOneByName(values.name);
    if (existing) {
      throw new Error(`Default label with name "${values.name}" already exists`);
    }

    const record = await sails.models.organizationdefaultlabel.create(values).fetch();
    clearCache(); // Limpar cache após criação
    sails.log.info(`[ORG_DEFAULT_LABELS] Created: ${record.name} (${record.color})`);
    return record;
  },

  updateOne: async (id, values) => {
    // Se mudar nome, validar unicidade
    if (values.name) {
      const existing = await module.exports.getOneByName(values.name);
      if (existing && existing.id !== id) {
        throw new Error(`Default label with name "${values.name}" already exists`);
      }
    }

    const record = await sails.models.organizationdefaultlabel
      .updateOne({ id })
      .set({ ...values, updatedAt: new Date() });
    
    if (record) {
      clearCache(); // Limpar cache após atualização
      sails.log.info(`[ORG_DEFAULT_LABELS] Updated: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  deleteOne: async (id) => {
    const record = await sails.models.organizationdefaultlabel.destroyOne({ id });
    
    if (record) {
      clearCache(); // Limpar cache após eliminação
      sails.log.info(`[ORG_DEFAULT_LABELS] Deleted: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  reorder: async (orderArray) => {
    // orderArray: [{ id, position }, ...]
    await sails.getDatastore().transaction(async (db) => {
      for (const item of orderArray) {
        await sails.models.organizationdefaultlabel
          .update({ id: item.id })
          .set({ position: item.position })
          .usingConnection(db);
      }
    });

    clearCache(); // Limpar cache após reordenação
    sails.log.info(`[ORG_DEFAULT_LABELS] Reordered ${orderArray.length} labels`);
  },
  
  // Função auxiliar para limpar cache manualmente se necessário
  clearCache,
};

