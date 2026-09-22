/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  await knex.schema.alterTable('chat_participant', (table) => {
    table.timestamp('left_at', { useTz: true });
    table.text('left_reason');
    table.bigInteger('history_visible_through_message_id');
    table.timestamp('history_hidden_at', { useTz: true });
  });

  await knex.raw(`
    ALTER TABLE chat_participant
    ADD CONSTRAINT chat_participant_left_reason_check
    CHECK (
      (left_at IS NULL AND left_reason IS NULL)
      OR (left_at IS NOT NULL AND left_reason IS NOT NULL AND left_reason IN ('left', 'removed'))
    )
  `);
};

exports.down = async () => {
  throw new Error(
    'chat participant lifecycle migration cannot be rolled back safely: it would reactivate historical participants',
  );
};
