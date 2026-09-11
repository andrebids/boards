const getDescendantIds = (items, id) => {
  const ids = new Set([id]);
  const children = new Map();
  items.forEach((item) => {
    if (!children.has(item.parentId)) children.set(item.parentId, []);
    children.get(item.parentId).push(item.id);
  });
  ids.forEach((parentId) => {
    (children.get(parentId) || []).forEach((childId) => ids.add(childId));
  });
  ids.delete(id);
  return [...ids];
};

const isValidParent = (items, item, parentId) => {
  const byId = new Map(items.map((entry) => [entry.id, entry]));
  byId.set(item.id, { ...item, parentId });
  return [item.id, ...getDescendantIds(items, item.id)].every((id) => {
    const visited = new Set();
    let current = byId.get(id);
    let taskDepth = 0;
    while (current) {
      if (visited.has(current.id) || current.ganttPlanId !== item.ganttPlanId) return false;
      visited.add(current.id);
      if (current.itemType === 'summary') return !current.parentId;
      taskDepth += 1;
      if (current.itemType !== 'task' || taskDepth > 2) return false;
      if (!current.parentId) return true;
      current = byId.get(current.parentId);
      if (!current) return false;
    }
    return true;
  });
};

// Serialize hierarchy changes in one plan, including validation and cascade deletion.
const lockPlan = (id, db) =>
  sails
    .sendNativeQuery('SELECT id FROM gantt_plan WHERE id = $1 FOR UPDATE', [id])
    .usingConnection(db);

module.exports = { getDescendantIds, isValidParent, lockPlan };
