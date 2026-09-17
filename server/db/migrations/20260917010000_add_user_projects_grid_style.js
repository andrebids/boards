exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.string('default_projects_grid_style').notNullable().defaultTo('regular');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('default_projects_grid_style');
  });
};
