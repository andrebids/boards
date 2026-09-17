const { isId } = require('./validators');

const MODES = ['disabled', 'all', 'selected'];
const PAGE_SIZE = 50;

const normalizeStage = (name) => (name || '').trim().replace(/\s+/gu, ' ').toLowerCase();

const canUseView = (project, userId) =>
  project.transversalMode === 'all' ||
  (project.transversalMode === 'selected' &&
    Array.isArray(project.transversalUserIds) &&
    project.transversalUserIds.includes(userId));

const isUserIds = (value) =>
  Array.isArray(value) &&
  value.length <= 100 &&
  value.every((id) => typeof id === 'string' && isId(id));

const groupLists = (lists) => {
  const stages = new Map();
  lists.forEach((list) => {
    const key = normalizeStage(list.name);
    if (!key) return;
    if (!stages.has(key)) {
      stages.set(key, { key, name: list.name.trim().replace(/\s+/gu, ' '), listIds: [] });
    }
    stages.get(key).listIds.push(list.id);
  });
  return [...stages.values()];
};

module.exports = { MODES, PAGE_SIZE, normalizeStage, canUseView, isUserIds, groupLists };
