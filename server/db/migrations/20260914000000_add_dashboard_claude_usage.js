exports.up = async (knex) => {
  await knex.schema.alterTable('dashboard', (table) => {
    table.jsonb('claude_usage');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('dashboard', (table) => {
    table.dropColumn('claude_usage');
  });
};
