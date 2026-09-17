const STATUSES = ['online', 'idle'];
const DEFAULT_STATUS = 'online';

// O que cada cliente reportou sobre si próprio. Quem está ligado mas nunca
// reportou conta como online -- o simples facto de ter socket chega.
const reportedStatusByUserId = new Map();

let lastSnapshotKey = null;

const isValidStatus = (status) => STATUSES.includes(status);

const setReportedStatus = (userId, status) => {
  if (!isValidStatus(status)) {
    throw new Error(`Unknown presence status: ${status}`);
  }

  reportedStatusByUserId.set(userId, status);
};

// Quem já não tem socket deixa de interessar: o estado reportado morre com a ligação.
const computeSnapshot = (connectedUserIds) => {
  const connected = new Set(connectedUserIds);

  reportedStatusByUserId.forEach((_, userId) => {
    if (!connected.has(userId)) {
      reportedStatusByUserId.delete(userId);
    }
  });

  return [...connected].sort().map((userId) => ({
    userId,
    status: reportedStatusByUserId.get(userId) || DEFAULT_STATUS,
  }));
};

const toKey = (snapshot) => snapshot.map(({ userId, status }) => `${userId}:${status}`).join(',');

const hasChanged = (snapshot) => toKey(snapshot) !== lastSnapshotKey;

const commit = (snapshot) => {
  lastSnapshotKey = toKey(snapshot);
};

// Só para os testes: repõe o módulo entre casos.
const reset = () => {
  reportedStatusByUserId.clear();
  lastSnapshotKey = null;
};

module.exports = {
  STATUSES,
  DEFAULT_STATUS,
  isValidStatus,
  setReportedStatus,
  computeSnapshot,
  hasChanged,
  commit,
  reset,
};
