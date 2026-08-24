exports.up = async (knex) => {
  await knex.schema.alterTable('task', (table) => {
    table.bigInteger('parent_task_id').nullable();
    table.foreign('parent_task_id').references('id').inTable('task').onDelete('SET NULL');
    table.index(['task_list_id', 'parent_task_id', 'position'], 'task_parent_position_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('task', (table) => {
    table.dropIndex(['task_list_id', 'parent_task_id', 'position'], 'task_parent_position_idx');
    table.dropColumn('parent_task_id');
  });
};
