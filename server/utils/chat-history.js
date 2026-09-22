// Mutated enrichment is omitted for former members; no historical versions are stored.
const isHistoricalExtraVisible = (record, participant) => {
  if (!participant || !participant.leftAt) return true;
  const boundary = new Date(participant.leftAt).getTime();
  return ['createdAt', 'updatedAt', 'fetchedAt'].every(
    (key) => !record[key] || new Date(record[key]).getTime() <= boundary,
  );
};

module.exports = { isHistoricalExtraVisible };
