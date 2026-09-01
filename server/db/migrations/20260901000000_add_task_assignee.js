exports.up = async (knex) => {
  await knex.schema.createTable('task_assignee', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('task_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('task_id').references('id').inTable('task').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['task_id', 'user_id'], {
      indexName: 'task_assignee_task_user_unique',
    });
    table.index(['user_id'], 'task_assignee_user_idx');
  });

  await knex.raw(`
    INSERT INTO task_assignee (task_id, user_id)
    SELECT id, assignee_user_id
    FROM task
    WHERE assignee_user_id IS NOT NULL
    ON CONFLICT (task_id, user_id) DO NOTHING
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('task_assignee');
};
