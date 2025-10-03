/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  getAll: async () => {
    console.log('🔵 [QM] OrganizationDefaultLabel.getAll()');
    const records = await sails.models.organizationdefaultlabel
      .find()
      .sort('position ASC');
    console.log(`✅ [QM] Encontrados ${records.length} labels padrão`);
    return records;
  },

  getOneById: async (id) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.getOneById(${id})`);
    const record = await sails.models.organizationdefaultlabel.findOne({ id });
    console.log(`✅ [QM] Label ${record ? 'encontrado' : 'não encontrado'}`);
    return record || null;
  },

  getOneByName: async (name) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.getOneByName("${name}")`);
    const records = await sails.models.organizationdefaultlabel.find();
    const record = records.find(r => r.name.toLowerCase() === name.toLowerCase());
    console.log(`✅ [QM] Label "${name}" ${record ? 'existe' : 'não existe'}`);
    return record || null;
  },

  createOne: async (values) => {
    console.log('🔵 [QM] OrganizationDefaultLabel.createOne()', values);
    // Validar unicidade (case-insensitive)
    const existing = await module.exports.getOneByName(values.name);
    if (existing) {
      throw new Error(`Default label with name "${values.name}" already exists`);
    }

    const record = await sails.models.organizationdefaultlabel.create(values).fetch();
    console.log(`✅ [QM] Label criado: "${record.name}" (${record.color})`);
    sails.log.info(`[ORG_DEFAULT_LABELS] Created: ${record.name} (${record.color})`);
    return record;
  },

  updateOne: async (id, values) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.updateOne(${id})`, values);
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
      console.log(`✅ [QM] Label atualizado: "${record.name}"`);
      sails.log.info(`[ORG_DEFAULT_LABELS] Updated: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  deleteOne: async (id) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.deleteOne(${id})`);
    
    const record = await sails.models.organizationdefaultlabel.destroyOne({ id });
    
    if (record) {
      console.log(`✅ [QM] Label eliminado: "${record.name}"`);
      sails.log.info(`[ORG_DEFAULT_LABELS] Deleted: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  reorder: async (orderArray) => {
    console.log('🔵 [QM] OrganizationDefaultLabel.reorder()', `${orderArray.length} items`);
    // orderArray: [{ id, position }, ...]
    await sails.getDatastore().transaction(async (db) => {
      for (const item of orderArray) {
        await sails.models.organizationdefaultlabel
          .update({ id: item.id })
          .set({ position: item.position })
          .usingConnection(db);
      }
    });

    console.log(`✅ [QM] ${orderArray.length} labels reordenados`);
    sails.log.info(`[ORG_DEFAULT_LABELS] Reordered ${orderArray.length} labels`);
  },
};

