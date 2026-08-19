exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.boolean('auto_add_board_members_to_cards').notNullable().defaultTo(false);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.dropColumn('auto_add_board_members_to_cards');
  });
};
