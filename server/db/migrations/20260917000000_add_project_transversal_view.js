exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.string('transversal_mode').notNullable().defaultTo('disabled');
    table.jsonb('transversal_user_ids').notNullable().defaultTo('[]');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.dropColumn('transversal_mode');
    table.dropColumn('transversal_user_ids');
  });
};
