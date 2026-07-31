/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createMentionMarkupLanguageData, filterMentionUsers } from './mention-utils';

const USERS = [
  {
    id: 'user-1',
    display: 'andre',
    name: 'André Garcia',
  },
  {
    id: 'user-2',
    display: 'maria',
    name: 'Maria Silva',
  },
];

describe('Markdown editor mention autocomplete', () => {
  it('filters users by username or name without depending on accents', () => {
    expect(filterMentionUsers(USERS, 'Andre')).toEqual([USERS[0]]);
    expect(filterMentionUsers(USERS, 'silva')).toEqual([USERS[1]]);
  });

  it('inserts the mention syntax consumed by comment notifications', () => {
    const languageData = createMentionMarkupLanguageData(USERS);
    const result = languageData.autocomplete({
      matchBefore: () => ({
        from: 6,
        text: '@and',
      }),
    });

    expect(result.from).toBe(6);
    expect(result.options).toEqual([
      expect.objectContaining({
        label: '@andre',
        apply: '@[andre](user-1) ',
      }),
    ]);
  });
});
