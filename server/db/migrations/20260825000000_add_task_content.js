exports.up = async (knex) => {
  await knex.schema.alterTable('task', (table) => {
    table.text('content');
  });

  await knex('task').whereNull('content').update({ content: knex.ref('name') });

  await knex.schema.alterTable('task', (table) => {
    table.text('content').notNullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('task', (table) => {
    table.dropColumn('content');
  });
};
