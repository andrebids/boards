/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Autocomplete,
  AutocompleteActionKind,
  closeAutocomplete,
  getAutocompleteState,
  getReactRendererFromState,
  openAutocomplete,
} from '@gravity-ui/markdown-editor';
import { Popup } from '@gravity-ui/uikit';

import UserAvatar from '../../users/UserAvatar';
import { filterMentionUsers } from './mention-utils';

import styles from './MarkdownEditor.module.scss';

const MENTION_NODE_NAME = 'plankaMention';
const MENTION_TOKEN_NAME = 'planka_mention';
const MENTION_DECORATION_CLASS = 'planka-mention-autocomplete';
const MENTION_DATA_ATTRIBUTE = 'data-mention-user-id';

const mentionMarkdownPlugin = (md) => {
  md.inline.ruler.before('text', MENTION_TOKEN_NAME, (state, silent) => {
    const match = state.src.slice(state.pos).match(/^@\[([^\]]+)\]\(([^)\s]+)\)/);

    if (!match) {
      return false;
    }

    if (!silent) {
      const token = state.push(MENTION_TOKEN_NAME, 'span', 0);
      token.content = `@${match[1]}`;
      token.meta = {
        display: match[1],
        userId: match[2],
      };
    }

    state.pos += match[0].length; // eslint-disable-line no-param-reassign
    return true;
  });

  return md;
};

const addMentionNode = (builder) => {
  builder.configureMd(mentionMarkdownPlugin);
  builder.addNode(MENTION_NODE_NAME, () => ({
    spec: {
      attrs: {
        display: {},
        userId: {},
      },
      atom: true,
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [
        {
          tag: `span[${MENTION_DATA_ATTRIBUTE}]`,
          getAttrs: (element) => ({
            display: element.textContent.replace(/^@/, ''),
            userId: element.getAttribute(MENTION_DATA_ATTRIBUTE),
          }),
        },
      ],
      toDOM: ({ attrs }) => [
        'span',
        {
          class: styles.mention,
          contentEditable: false,
          [MENTION_DATA_ATTRIBUTE]: attrs.userId,
        },
        `@${attrs.display}`,
      ],
    },
    fromMd: {
      tokenName: MENTION_TOKEN_NAME,
      tokenSpec: {
        name: MENTION_NODE_NAME,
        type: 'block',
        noCloseToken: true,
        getAttrs: (token) => token.meta,
      },
    },
    toMd: (state, node) => {
      state.text(`@[${node.attrs.display}](${node.attrs.userId})`, false);
    },
  }));
};

function MentionSuggestions({ anchorElement, currentIndex, items, onSelect }) {
  return (
    <Popup
      open={items.length > 0}
      anchorElement={anchorElement}
      placement={['bottom-start', 'top-start']}
      disablePortal
    >
      <div className={styles.mentionSuggestions} role="listbox" aria-label="Utilizadores">
        {items.map((user, index) => (
          <button
            key={user.id}
            type="button"
            role="option"
            aria-selected={index === currentIndex}
            className={styles.mentionSuggestion}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(index)}
          >
            <UserAvatar id={user.id} size="tiny" />
            <span className={styles.mentionSuggestionText}>
              <strong>{user.name || user.display}</strong>
              {user.name && user.name !== user.display && <small>@{user.display}</small>}
            </span>
          </button>
        ))}
      </div>
    </Popup>
  );
}

MentionSuggestions.propTypes = {
  anchorElement: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  currentIndex: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      display: PropTypes.string.isRequired,
      name: PropTypes.string,
    }),
  ).isRequired,
  onSelect: PropTypes.func.isRequired,
};

MentionSuggestions.defaultProps = {
  anchorElement: undefined,
};

class MentionHandler {
  constructor(users) {
    this.users = users;
    this.items = users;
    this.currentIndex = 0;
    this.view = null;
    this.anchorElement = null;
    this.rendererItem = null;
  }

  onOpen(action) {
    this.update(action);
    this.filter(action.filter);
    this.render();
    return true;
  }

  onFilter(action) {
    this.update(action);
    this.filter(action.filter);

    if (!this.items.length) {
      closeAutocomplete(action.view);
      return true;
    }

    this.render();
    return true;
  }

  onArrow(action) {
    this.update(action);

    if (!this.items.length) {
      return false;
    }

    if (action.kind === AutocompleteActionKind.up) {
      this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    } else if (action.kind === AutocompleteActionKind.down) {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
    } else {
      return false;
    }

    this.render();
    return true;
  }

  onEnter(action) {
    this.update(action);
    this.select(this.currentIndex);
    return true;
  }

  onClose() {
    this.clear();
    return true;
  }

  onDestroy() {
    this.clear();
  }

  update({ view }) {
    this.view = view;
    this.anchorElement =
      view.dom.getElementsByClassName(MENTION_DECORATION_CLASS).item(0) ||
      view.dom.getElementsByClassName('autocomplete').item(0);
  }

  filter(query = '') {
    this.items = filterMentionUsers(this.users, query);
    this.currentIndex = 0;
  }

  select = (index) => {
    const user = this.items[index];
    const autocompleteState = this.view && getAutocompleteState(this.view.state);

    if (!user || !autocompleteState || !autocompleteState.active) {
      return;
    }

    const mentionType = this.view.state.schema.nodes[MENTION_NODE_NAME];
    const mentionNode = mentionType.create({
      display: user.display,
      userId: user.id,
    });
    const { from, to } = autocompleteState.range;
    const transaction = this.view.state.tr
      .replaceWith(from, to, mentionNode)
      .insertText(' ', from + mentionNode.nodeSize)
      .scrollIntoView();

    this.view.dispatch(transaction);
    this.view.focus();
  };

  render() {
    if (!this.rendererItem && this.view) {
      this.rendererItem = getReactRendererFromState(this.view.state).createItem(
        'mention_suggest',
        () => (
          <MentionSuggestions
            anchorElement={this.anchorElement}
            currentIndex={this.currentIndex}
            items={this.items}
            onSelect={this.select}
          />
        ),
      );
    }

    this.rendererItem?.rerender();
  }

  clear() {
    this.view = null;
    this.anchorElement = null;
    this.items = [];
    this.currentIndex = 0;
    this.rendererItem?.remove();
    this.rendererItem = null;
  }
}

const createUserMentionExtension = (users) => (builder) => {
  addMentionNode(builder);

  if (!users.length) {
    return;
  }

  if (!builder.context.has('autocomplete')) {
    builder.use(Autocomplete);
  }

  builder.context.get('autocomplete').add({
    trigger: {
      name: 'planka-mention',
      trigger: '@',
      allArrowKeys: false,
      cancelOnFirstSpace: false,
      decorationAttrs: {
        class: MENTION_DECORATION_CLASS,
      },
    },
    handler: new MentionHandler(users),
  });
  builder.addKeymap(
    () => ({
      '@': (_state, _dispatch, view) => {
        openAutocomplete(view, '@');
        return true;
      },
    }),
    builder.Priority.VeryHigh,
  );
};

export default createUserMentionExtension;
