exports.up = async (knex) => {
  await knex.schema.alterTable('gantt_item', (table) => {
    table.bigInteger('source_card_id').unique();
    table.foreign('source_card_id').references('id').inTable('card').onDelete('SET NULL');
    table.index(['source_card_id'], 'gantt_item_source_card_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('gantt_item', (table) => {
    table.dropIndex(['source_card_id'], 'gantt_item_source_card_idx');
    table.dropColumn('source_card_id');
  });
};
