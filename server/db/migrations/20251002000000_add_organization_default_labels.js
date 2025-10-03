/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  console.log('🔵 [MIGRATION] Iniciando criação da tabela organization_default_label...');
  
  // Criar tabela organization_default_label
  await knex.schema.createTable('organization_default_label', (table) => {
    /* Columns */
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('name').notNullable();
    table.text('color').notNullable();
    table.integer('position').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    /* Indexes */
    table.index(['position'], 'idx_org_default_label_position');
  });

  // Criar índice único case-insensitive separadamente
  await knex.raw('CREATE UNIQUE INDEX uq_org_default_label_name ON organization_default_label (lower(name))');

  // Seed inicial com etiquetas comuns (português)
  const defaultLabels = [
    { name: 'Aprovado', color: 'sunny-grass', position: 1 },
    { name: 'Rejeitado', color: 'rosso-corsa', position: 2 },
    { name: 'Em Revisão', color: 'summer-sky', position: 3 },
    { name: 'Precisa Trabalho', color: 'bright-yellow', position: 4 },
  ];

  console.log('🔵 [MIGRATION] Inserindo 4 labels padrão (seed)...');
  await knex('organization_default_label').insert(defaultLabels);
  console.log('✅ [MIGRATION] Migration completa! Tabela + índices + seeds criados.');
};

exports.down = async (knex) => {
  console.log('🔴 [MIGRATION] Revertendo: removendo tabela organization_default_label...');
  await knex.schema.dropTableIfExists('organization_default_label');
  console.log('✅ [MIGRATION] Rollback completo.');
};

