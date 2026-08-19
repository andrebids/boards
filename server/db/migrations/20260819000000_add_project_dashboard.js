exports.up = async (knex) => {
  await knex.schema.createTable('project_dashboard', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable().unique();
    table.boolean('is_enabled').notNullable().defaultTo(false);
    table.jsonb('layout').notNullable().defaultTo('[]');
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('project_id').references('id').inTable('project').onDelete('CASCADE');
  });

  await knex.schema.createTable('project_dashboard_member', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_dashboard_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table
      .foreign('project_dashboard_id')
      .references('id')
      .inTable('project_dashboard')
      .onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['project_dashboard_id', 'user_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('project_dashboard_member');
  await knex.schema.dropTableIfExists('project_dashboard');
};
