/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const hasDependencyCycle = (itemIds, links) => {
  const outgoing = new Map(itemIds.map((id) => [id, []]));
  const indegree = new Map(itemIds.map((id) => [id, 0]));

  links.forEach(({ sourceItemId, targetItemId }) => {
    const targets = outgoing.get(sourceItemId);
    if (targets) {
      targets.push(targetItemId);
    }
    indegree.set(targetItemId, (indegree.get(targetItemId) || 0) + 1);
  });

  const queue = itemIds.filter((id) => indegree.get(id) === 0);
  let visited = 0;

  while (queue.length > 0) {
    const id = queue.shift();
    visited += 1;
    outgoing.get(id).forEach((targetId) => {
      const nextIndegree = indegree.get(targetId) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(targetId);
      }
    });
  }

  return visited !== itemIds.length;
};

module.exports = {
  hasDependencyCycle,
};
