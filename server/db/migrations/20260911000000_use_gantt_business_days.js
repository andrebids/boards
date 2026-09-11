// Inclusive Monday-Friday count, with the existing minimum duration of one day.
// Whole weeks plus the weekdays before and after the remaining weekend.
const businessDuration = `GREATEST(1,
  ((end_date - start_date + 1) / 7) * 5
  + LEAST((end_date - start_date + 1) % 7,
      GREATEST(6 - EXTRACT(ISODOW FROM start_date)::integer, 0))
  + GREATEST((end_date - start_date + 1) % 7
      - (8 - EXTRACT(ISODOW FROM start_date)::integer), 0)
)`;

exports.up = async (knex) => {
  await knex.raw('ALTER TABLE gantt_item DROP CONSTRAINT gantt_item_dates_duration_check');
  await knex.raw(`
    UPDATE gantt_item SET expected_duration_days = ${businessDuration}
    WHERE start_date IS NOT NULL
      AND expected_duration_days IS DISTINCT FROM ${businessDuration}
  `);
  await knex.raw(`
    ALTER TABLE gantt_item ADD CONSTRAINT gantt_item_dates_duration_check
    CHECK (start_date IS NULL OR expected_duration_days = ${businessDuration})
  `);
};

exports.down = async (knex) => {
  await knex.raw('ALTER TABLE gantt_item DROP CONSTRAINT gantt_item_dates_duration_check');
  await knex.raw(`
    UPDATE gantt_item SET expected_duration_days = end_date - start_date + 1
    WHERE start_date IS NOT NULL
  `);
  await knex.raw(`
    ALTER TABLE gantt_item ADD CONSTRAINT gantt_item_dates_duration_check
    CHECK (start_date IS NULL OR end_date - start_date + 1 = expected_duration_days)
  `);
};
