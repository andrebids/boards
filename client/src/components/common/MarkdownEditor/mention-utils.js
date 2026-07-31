/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const MAX_SUGGESTIONS = 20;

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const filterMentionUsers = (users, query = '') => {
  const normalizedQuery = normalize(query.trim());

  return users
    .filter(({ display, name }) => {
      if (!normalizedQuery) {
        return true;
      }

      return [display, name].some((value) => value && normalize(value).includes(normalizedQuery));
    })
    .slice(0, MAX_SUGGESTIONS);
};

export const createMentionMarkupLanguageData = (users) => ({
  autocomplete: (context) => {
    const word = context.matchBefore(/@[^\n@]*$/);

    if (!word) {
      return null;
    }

    const query = word.text.slice(1);
    const matchingUsers = filterMentionUsers(users, query);

    if (!matchingUsers.length) {
      return null;
    }

    return {
      from: word.from,
      options: matchingUsers.map(({ id, display, name }) => ({
        label: `@${display}`,
        detail: name !== display ? name : undefined,
        type: 'text',
        apply: `@[${display}](${id}) `,
      })),
      validFor: /^@[^\n@]*$/,
    };
  },
});
