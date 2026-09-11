import { isValidParent } from './ganttHierarchy';

// Read the destination used by SVAR's indent-task command, without moving its tree.
export const getGanttRowDropIntent = (items, task, parent, offset) => {
  const item = items.find((entry) => entry.id === task.id);
  const siblings = parent.data || [];
  const index = siblings.findIndex((entry) => entry.id === task.id);
  let parentId = task.parent || null;
  let level = task.$level;
  let mode;
  let available = true;
  if (offset >= 20) {
    const previous = siblings[index - 1];
    available = Boolean(previous);
    parentId = previous?.id;
    level += 1;
    mode = true;
  } else if (offset <= -20) {
    available = Boolean(task.parent);
    parentId = parent.parent || null;
    level -= 1;
    mode = false;
  }
  return {
    mode,
    parentId,
    level,
    valid: Boolean(available && item && isValidParent(items, item, parentId)),
  };
};

const getGanttRowMoveChanges = (items, id, parentId, beforeId = null) => {
  const item = items.find((entry) => entry.id === id);
  if (!item || !isValidParent(items, item, parentId)) return null;
  const siblings = items
    .filter((entry) => (entry.parentId || null) === parentId)
    .sort((a, b) => a.position - b.position);
  const currentIndex = siblings.findIndex((entry) => entry.id === id);
  const remaining = siblings.filter((entry) => entry.id !== id);
  const index = beforeId ? remaining.findIndex((entry) => entry.id === beforeId) : remaining.length;
  if (index < 0 || ((item.parentId || null) === parentId && currentIndex === index)) return null;
  const previousPosition = remaining[index - 1]?.position || 0;
  const nextPosition = remaining[index]?.position;
  const position =
    nextPosition === undefined
      ? previousPosition + 65536
      : previousPosition + (nextPosition - previousPosition) / 2;
  // Do not silently save an ambiguous order when the numeric gap is exhausted.
  if (position <= previousPosition || (nextPosition !== undefined && position >= nextPosition)) {
    return null;
  }
  return { parentId, position, version: item.version };
};

export default getGanttRowMoveChanges;

export const getGanttListDropChanges = (items, id, targetId, mode) => {
  const item = items.find((entry) => entry.id === id);
  const target = items.find((entry) => entry.id === targetId);
  if (!item || (targetId && !target) || !['before', 'after', 'child'].includes(mode)) return null;
  const parentId = (mode === 'child' ? target?.id : target?.parentId) || null;
  if (!isValidParent(items, item, parentId)) return null;
  let beforeId = mode === 'before' ? target?.id : null;
  if (target && mode === 'after') {
    const siblings = items
      .filter((entry) => entry.id !== id && (entry.parentId || null) === parentId)
      .sort((a, b) => a.position - b.position);
    beforeId = siblings[siblings.findIndex((entry) => entry.id === target.id) + 1]?.id;
  }
  const changes = getGanttRowMoveChanges(items, id, parentId, beforeId);
  if (changes) return changes;
  const currentSiblings = items
    .filter((entry) => (entry.parentId || null) === parentId)
    .sort((a, b) => a.position - b.position);
  const index = currentSiblings.findIndex((entry) => entry.id === id);
  // Scheduling is still required for a task already at this position; an exhausted gap is invalid.
  if (index >= 0 && (currentSiblings[index + 1]?.id || null) === (beforeId || null)) {
    return { parentId, version: item.version };
  }
  return null;
};
