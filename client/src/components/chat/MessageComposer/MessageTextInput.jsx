import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Mention, MentionsInput } from 'react-mentions';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import ChatAvatar from '../ChatAvatar';
import styles from './MessageComposer.module.scss';

const mentionsInputStyle = {
  control: {
    fontFamily: 'inherit',
    fontSize: 'var(--chat-font-body)',
    fontWeight: 400,
    letterSpacing: 'normal',
    lineHeight: '18px',
    minHeight: '36px',
  },
  input: {
    background: 'transparent',
    border: 'none',
    boxSizing: 'border-box',
    color: '#edf3fa',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    letterSpacing: 'inherit',
    lineHeight: '18px',
    maxHeight: '84px',
    minHeight: '36px',
    outline: 'none',
    overflowY: 'auto',
    padding: '8px 10px',
  },
  highlighter: {
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    letterSpacing: 'inherit',
    lineHeight: '18px',
    maxHeight: '84px',
    minHeight: '36px',
    padding: '8px 10px',
  },
  suggestions: {
    backgroundColor: 'rgba(14, 19, 27, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 18px 42px rgba(0, 0, 0, 0.46)',
    marginTop: '8px',
    maxWidth: 'calc(100vw - 32px)',
    minWidth: '238px',
    overflow: 'hidden',
    padding: '5px',
    zIndex: 'var(--chat-layer-popover, 10033)',
    list: {
      listStyleType: 'none',
      margin: 0,
      maxHeight: '210px',
      overflowY: 'auto',
      padding: 0,
    },
    item: {
      borderRadius: '8px',
      color: '#dfe7f1',
      cursor: 'pointer',
      margin: '1px 0',
      padding: 0,
      transition: 'background-color 140ms ease, color 140ms ease',
      '&focused': {
        backgroundColor: 'rgba(4, 133, 247, 0.18)',
        color: '#ffffff',
      },
    },
  },
};

const editorStyle = {
  ...mentionsInputStyle,
  control: { ...mentionsInputStyle.control, minHeight: '66px' },
  input: { ...mentionsInputStyle.input, minHeight: '66px', maxHeight: '180px' },
  highlighter: {
    ...mentionsInputStyle.highlighter,
    minHeight: '66px',
    maxHeight: '180px',
  },
};

const MessageTextInput = React.memo(({ conversationId, isEditing, ...props }) => {
  const [t] = useTranslation();
  const members = useSelector(selectors.selectChatMembersForCurrentProject);
  const selectConversationById = useMemo(() => selectors.makeSelectChatConversationById(), []);
  const conversation = useSelector((state) => selectConversationById(state, conversationId));
  const mentionUsers = useMemo(() => {
    const participantIds = conversation?.participantUserIds || [];
    const allowedMembers =
      conversation?.type === 'projectDirect'
        ? members.filter((member) => participantIds.includes(member.id))
        : members;

    return allowedMembers.map((member) => ({
      ...member,
      id: member.id,
      display: member.username || member.name,
    }));
  }, [conversation, members]);

  const renderMentionSuggestion = useCallback(
    (entry, _, highlightedDisplay) => (
      <span className={styles.suggestion}>
        <ChatAvatar isOnline={entry.isOnline} user={entry} />
        <span className={styles.suggestionCopy}>
          <strong>{entry.name}</strong>
          <small>
            {entry.username ? (
              <>
                <span aria-hidden="true">@</span>
                {highlightedDisplay}
              </>
            ) : (
              t('chat.memberOfProject')
            )}
          </small>
        </span>
      </span>
    ),
    [t],
  );

  return (
    <MentionsInput
      maxLength={10000}
      allowSpaceInQuery
      allowSuggestionsAboveCursor
      a11ySuggestionsListLabel={t('chat.mentionSuggestions')}
      suggestionsPortalHost={document.body}
      style={isEditing ? editorStyle : mentionsInputStyle}
      {...props} // eslint-disable-line react/jsx-props-no-spreading
    >
      <Mention
        appendSpaceOnAdd
        data={mentionUsers}
        displayTransform={(_, display) => `@${display}`}
        renderSuggestion={renderMentionSuggestion}
        className={styles.mention}
      />
    </MentionsInput>
  );
});

MessageTextInput.propTypes = {
  conversationId: PropTypes.string.isRequired,
  isEditing: PropTypes.bool,
};

MessageTextInput.defaultProps = { isEditing: false };

export default MessageTextInput;
