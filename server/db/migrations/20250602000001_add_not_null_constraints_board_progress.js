/**
 * Migration to add NOT NULL constraints to board progress bar fields
 * This ensures data consistency and prevents NULL values
 */

exports.up = async (knex) => {
  // First, update any NULL values to their default values
  await knex.raw(`
    UPDATE board 
    SET progress_bar_enabled = false 
    WHERE progress_bar_enabled IS NULL
  `);
  
  await knex.raw(`
    UPDATE board 
    SET progress_bar_percentage = 0 
    WHERE progress_bar_percentage IS NULL
  `);

  // Then add NOT NULL constraints
  await knex.schema.alterTable('board', (table) => {
    table.boolean('progress_bar_enabled').notNullable().alter();
    table.integer('progress_bar_percentage').notNullable().alter();
  });
};

exports.down = async (knex) => {
  // Remove NOT NULL constraints (allow NULL values again)
  await knex.schema.alterTable('board', (table) => {
    table.boolean('progress_bar_enabled').nullable().alter();
    table.integer('progress_bar_percentage').nullable().alter();
  });
};
