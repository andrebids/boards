/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export default (md) => {
  md.inline.ruler.before('text', 'mention', (state, silent) => {
    const match = state.src.slice(state.pos).match(/^@\[([^\]]+)\]\(([^)\s]+)\)/);

    if (!match) {
      return false;
    }

    if (!silent) {
      const token = state.push('mention', 'span', 0);
      token.content = `@${match[1]}`;
      token.meta = {
        display: match[1],
        userId: match[2],
      };
    }

    state.pos += match[0].length; // eslint-disable-line no-param-reassign
    return true;
  });

  // eslint-disable-next-line no-param-reassign
  md.renderer.rules.mention = (tokens, index) => {
    const { display, userId } = tokens[index].meta;
    return `<span class="mention" data-user-id="${md.utils.escapeHtml(userId)}">@${md.utils.escapeHtml(display)}</span>`;
  };
};
