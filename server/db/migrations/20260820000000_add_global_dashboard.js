exports.up = async (knex) => {
  await knex.schema.createTable('dashboard', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.string('key').notNullable().unique();
    table.jsonb('layout').notNullable().defaultTo('[]');
    table.integer('version').notNullable().defaultTo(1);
    table.bigInteger('edit_lock_user_id');
    table.timestamp('edit_lock_expires_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table
      .foreign('edit_lock_user_id')
      .references('id')
      .inTable('user_account')
      .onDelete('SET NULL');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('dashboard');
};
