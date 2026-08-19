/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { isActiveTextElement } from './element-helpers';

describe('isActiveTextElement', () => {
  it('recognizes rich-text editing elements', () => {
    expect(
      isActiveTextElement({
        tagName: 'DIV',
        isContentEditable: true,
      }),
    ).toBe(true);
  });
});
