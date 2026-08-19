/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.createTable('comment_reaction', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('comment_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.text('emoji').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign('comment_id').references('id').inTable('comment').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['comment_id', 'user_id', 'emoji'], {
      indexName: 'comment_reaction_comment_user_emoji_unique',
    });
    table.index(['comment_id'], 'comment_reaction_comment_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('comment_reaction');
};
