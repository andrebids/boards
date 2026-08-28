const compareIds = (leftId, rightId) => {
  try {
    if (BigInt(leftId) === BigInt(rightId)) {
      return 0;
    }
    return BigInt(leftId) > BigInt(rightId) ? 1 : -1;
  } catch (error) {
    return String(leftId).localeCompare(String(rightId));
  }
};

const getGreaterId = (leftId, rightId) => {
  if (!leftId) {
    return rightId;
  }
  if (!rightId) {
    return leftId;
  }
  return compareIds(leftId, rightId) > 0 ? leftId : rightId;
};

const isIdAtOrBefore = (id, boundaryId) =>
  Boolean(id && boundaryId && compareIds(id, boundaryId) <= 0);

module.exports = {
  compareIds,
  getGreaterId,
  isIdAtOrBefore,
};
