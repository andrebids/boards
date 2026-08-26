/*! Copyright (c) 2024 PLANKA Software GmbH */

exports.up = async (knex) => {
  await knex.schema.createTable('web_push_subscription', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('user_id').notNullable();
    table.text('endpoint').notNullable();
    table.text('p256dh').notNullable();
    table.text('auth').notNullable();
    table.bigInteger('expiration_time');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });

    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['endpoint'], {
      indexName: 'web_push_subscription_endpoint_unique',
    });
    table.index(['user_id', 'created_at'], 'web_push_subscription_user_created_at_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('web_push_subscription');
};
