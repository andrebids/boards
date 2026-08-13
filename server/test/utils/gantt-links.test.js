/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const assert = require('assert');

const { hasDependencyCycle } = require('../../utils/gantt-links');

assert.strictEqual(
  hasDependencyCycle(
    ['1', '2', '3'],
    [
      { sourceItemId: '1', targetItemId: '2' },
      { sourceItemId: '2', targetItemId: '3' },
    ],
  ),
  false,
);
assert.strictEqual(
  hasDependencyCycle(
    ['1', '2', '3'],
    [
      { sourceItemId: '1', targetItemId: '2' },
      { sourceItemId: '2', targetItemId: '3' },
      { sourceItemId: '3', targetItemId: '1' },
    ],
  ),
  true,
);
