exports.up = async (knex) => {
  await knex.schema.alterTable('dashboard', (table) => {
    table.jsonb('codex_usage');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('dashboard', (table) => {
    table.dropColumn('codex_usage');
  });
};
