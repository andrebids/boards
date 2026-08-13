/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('gantt_item', (table) => {
    table.text('item_type').notNullable().defaultTo('task');
    table.bigInteger('parent_id');
    table.text('description');

    table.foreign('parent_id').references('id').inTable('gantt_item').onDelete('CASCADE');
    table.index(['parent_id', 'position'], 'gantt_item_parent_position_idx');
  });

  await knex.raw(`
    ALTER TABLE gantt_item
    ADD CONSTRAINT gantt_item_type_check CHECK (item_type IN ('task', 'summary')),
    ADD CONSTRAINT gantt_item_parent_check CHECK (
      (item_type = 'summary' AND parent_id IS NULL) OR item_type = 'task'
    )
  `);

  await knex.raw(`
    DO $$
    DECLARE
      legacy_group RECORD;
      summary_id BIGINT;
    BEGIN
      FOR legacy_group IN
        SELECT gantt_plan_id, project, MIN(position) AS first_position
        FROM gantt_item
        WHERE project IS NOT NULL AND BTRIM(project) <> ''
        GROUP BY gantt_plan_id, project
      LOOP
        summary_id := next_id();
        INSERT INTO gantt_item (
          id, gantt_plan_id, task, item_type, expected_duration_days, position
        ) VALUES (
          summary_id,
          legacy_group.gantt_plan_id,
          legacy_group.project,
          'summary',
          1,
          legacy_group.first_position - 0.5
        );

        UPDATE gantt_item
        SET parent_id = summary_id
        WHERE gantt_plan_id = legacy_group.gantt_plan_id
          AND project = legacy_group.project
          AND id <> summary_id;
      END LOOP;
    END $$
  `);

  await knex.schema.alterTable('gantt_item', (table) => {
    table.dropColumn('project');
  });

  await knex.schema.createTable('gantt_link', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('gantt_plan_id').notNullable();
    table.bigInteger('source_item_id').notNullable();
    table.bigInteger('target_item_id').notNullable();
    table.text('type').notNullable().defaultTo('e2s');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('gantt_plan_id').references('id').inTable('gantt_plan').onDelete('CASCADE');
    table.foreign('source_item_id').references('id').inTable('gantt_item').onDelete('CASCADE');
    table.foreign('target_item_id').references('id').inTable('gantt_item').onDelete('CASCADE');
    table.unique(['source_item_id', 'target_item_id'], {
      indexName: 'gantt_link_source_target_unique',
    });
    table.index(['gantt_plan_id'], 'gantt_link_plan_idx');
    table.index(['target_item_id'], 'gantt_link_target_idx');
  });

  await knex.raw(`
    ALTER TABLE gantt_link
    ADD CONSTRAINT gantt_link_type_check CHECK (type IN ('e2s')),
    ADD CONSTRAINT gantt_link_not_self_check CHECK (source_item_id <> target_item_id)
  `);
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('gantt_link');

  await knex.schema.alterTable('gantt_item', (table) => {
    table.text('project');
  });

  await knex.raw(`
    UPDATE gantt_item child
    SET project = parent.task
    FROM gantt_item parent
    WHERE child.parent_id = parent.id
  `);

  await knex.schema.alterTable('gantt_item', (table) => {
    table.dropIndex(['parent_id', 'position'], 'gantt_item_parent_position_idx');
    table.dropColumn('parent_id');
    table.dropColumn('item_type');
    table.dropColumn('description');
  });
};
