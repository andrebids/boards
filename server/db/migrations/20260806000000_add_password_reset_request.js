/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('password_reset_request', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('user_id');
    table.string('identifier_hash', 64).notNullable();
    table.string('remote_address_hash', 64).notNullable();
    table.string('token_hash', 64).unique();
    table.text('encrypted_token');
    table.text('status').notNullable();
    table.timestamp('scheduled_at', { useTz: true });
    table.timestamp('expires_at', { useTz: true });
    table.timestamp('sent_at', { useTz: true });
    table.timestamp('consumed_at', { useTz: true });
    table.integer('attempts').notNullable().defaultTo(0);
    table.text('last_error');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.index(['identifier_hash', 'created_at'], 'password_reset_identifier_created_idx');
    table.index(['remote_address_hash', 'created_at'], 'password_reset_ip_created_idx');
    table.index(['status', 'scheduled_at'], 'password_reset_status_scheduled_idx');
  });

  await knex.raw(`
    ALTER TABLE password_reset_request
    ADD CONSTRAINT password_reset_request_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'consumed', 'superseded', 'skipped', 'failed'))
  `);

  await knex.schema.createTable('password_reset_attempt', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.string('remote_address_hash', 64).notNullable();
    table.boolean('succeeded').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['remote_address_hash', 'created_at'], 'password_reset_attempt_ip_created_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('password_reset_attempt');
  await knex.schema.dropTableIfExists('password_reset_request');
};
