exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.boolean('is_archived').notNullable().defaultTo(false);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.dropColumn('is_archived');
  });
};
