import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Mention, MentionsInput } from 'react-mentions';
import { useDropzone } from 'react-dropzone';
import { Paperclip, Send, Smile, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import selectors from '../../../selectors';
import FilePicker from '../../../lib/custom-ui/components/FilePicker/FilePicker';
import ChatAvatar from '../ChatAvatar';
import LazyEmojiPicker from '../LazyEmojiPicker';

import styles from './MessageComposer.module.scss';

const mentionsInputStyle = {
  control: { minHeight: '36px' },
  input: {
    background: 'transparent',
    border: 'none',
    boxSizing: 'border-box',
    color: '#edf3fa',
    lineHeight: '18px',
    maxHeight: '84px',
    minHeight: '36px',
    outline: 'none',
    overflowY: 'auto',
    padding: '8px 10px',
  },
  highlighter: {
    boxSizing: 'border-box',
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
    zIndex: 10,
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
        backgroundColor: 'rgba(94, 136, 207, 0.18)',
        color: '#ffffff',
      },
    },
  },
};

const MessageComposer = React.memo(({ conversationId, isDisabled }) => {
  const [t] = useTranslation();
  const [files, setFiles] = useState([]);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const typingSentAtRef = useRef(0);
  const selectDraft = useMemo(() => selectors.makeSelectChatDraftByConversationId(), []);
  const selectReplyTarget = useMemo(
    () => selectors.makeSelectChatReplyTargetByConversationId(),
    [],
  );
  const text = useSelector((state) => selectDraft(state, conversationId));
  const replyTarget = useSelector((state) => selectReplyTarget(state, conversationId));
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

  const send = useCallback(() => {
    const normalizedText = text.trim();

    if ((!normalizedText && files.length === 0) || isDisabled) {
      return;
    }

    dispatch(
      entryActions.createChatMessage(conversationId, {
        text: normalizedText,
        files,
        replyToMessageId: replyTarget?.id,
      }),
    );
    dispatch(entryActions.updateChatDraft(conversationId, ''));
    dispatch(entryActions.setChatReplyTarget(conversationId, null));
    dispatch(entryActions.updateChatTyping(conversationId, false));
    setFiles([]);
    setIsEmojiMenuOpen(false);
  }, [conversationId, dispatch, files, isDisabled, replyTarget?.id, text]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    },
    [send],
  );

  const handleTextChange = useCallback(
    (_, value) => {
      dispatch(entryActions.updateChatDraft(conversationId, value));
      const now = Date.now();
      if (value.trim() && now - typingSentAtRef.current > 1800) {
        typingSentAtRef.current = now;
        dispatch(entryActions.updateChatTyping(conversationId, true));
      } else if (!value.trim()) {
        typingSentAtRef.current = 0;
        dispatch(entryActions.updateChatTyping(conversationId, false));
      }
    },
    [conversationId, dispatch],
  );
  const handleFilesSelect = useCallback((selectedFiles) => {
    setFiles((currentFiles) => [...currentFiles, ...selectedFiles]);
  }, []);
  const removeFile = useCallback((index) => {
    setFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index));
  }, []);
  const addEmoji = useCallback(
    (emoji) => {
      dispatch(entryActions.updateChatDraft(conversationId, `${text}${emoji}`));
      setIsEmojiMenuOpen(false);
    },
    [conversationId, dispatch, text],
  );
  const handleEmojiClick = useCallback((emojiData) => addEmoji(emojiData.emoji), [addEmoji]);

  const handleFilesDrop = useCallback(
    (acceptedFiles) => handleFilesSelect(acceptedFiles),
    [handleFilesSelect],
  );
  const { getRootProps, isDragActive } = useDropzone({
    disabled: isDisabled,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: handleFilesDrop,
  });

  useEffect(
    () => () => {
      dispatch(entryActions.updateChatTyping(conversationId, false));
    },
    [conversationId, dispatch],
  );

  const cancelReply = useCallback(() => {
    dispatch(entryActions.setChatReplyTarget(conversationId, null));
  }, [conversationId, dispatch]);
  const replyAuthorName =
    members.find(({ id }) => id === replyTarget?.userId)?.name || t('chat.conversation');

  return (
    // React Dropzone exposes the accessible drag-and-drop handlers as root props.
    // eslint-disable-next-line react/jsx-props-no-spreading
    <div {...getRootProps()} className={styles.wrapper}>
      {isDragActive && <div className={styles.dropOverlay}>{t('chat.dropFilesHere')}</div>}
      {replyTarget && (
        <div className={styles.replyBar}>
          <span>
            <strong>{t('chat.replyingTo', { name: replyAuthorName })}</strong>
            <small>{replyTarget.deletedAt ? t('chat.messageDeleted') : replyTarget.text}</small>
          </span>
          <button type="button" aria-label={t('chat.cancelReply')} onClick={cancelReply}>
            <X aria-hidden="true" size={14} strokeWidth={2} />
          </button>
        </div>
      )}
      {files.length > 0 && (
        <div className={styles.files} aria-label={t('chat.pendingAttachments')}>
          {files.map((file, index) => (
            <span key={`${file.name}-${file.lastModified}`} className={styles.file}>
              <Paperclip aria-hidden="true" size={13} strokeWidth={2} />
              {file.name}
              <button
                type="button"
                aria-label={t('chat.removeAttachment', { name: file.name })}
                onClick={() => removeFile(index)}
              >
                <X aria-hidden="true" size={13} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={styles.composerRow}>
        <div className={styles.tools}>
          <FilePicker multiple onSelect={handleFilesSelect}>
            <button type="button" aria-label={t('chat.attachFiles')} disabled={isDisabled}>
              <Paperclip aria-hidden="true" size={17} strokeWidth={2} />
            </button>
          </FilePicker>
          <button
            type="button"
            aria-label={t('chat.addEmoji')}
            disabled={isDisabled}
            onClick={() => setIsEmojiMenuOpen((isOpen) => !isOpen)}
          >
            <Smile aria-hidden="true" size={17} strokeWidth={2} />
          </button>
          {isEmojiMenuOpen && (
            <div className={styles.emojiMenu} role="menu" aria-label={t('chat.chooseEmoji')}>
              <Suspense fallback={null}>
                <LazyEmojiPicker
                  className={styles.emojiPicker}
                  theme="dark"
                  width={260}
                  height={300}
                  previewConfig={{ showPreview: false }}
                  searchPlaceholder={t('chat.searchEmoji')}
                  onEmojiClick={handleEmojiClick}
                />
              </Suspense>
            </div>
          )}
        </div>
        <div className={styles.inputShell}>
          <MentionsInput
            value={text}
            maxLength={10000}
            disabled={isDisabled}
            aria-label={t('chat.writeMessage')}
            placeholder={isDisabled ? t('chat.conversationUnavailable') : t('chat.writeMessage')}
            allowSpaceInQuery
            allowSuggestionsAboveCursor
            a11ySuggestionsListLabel={t('chat.mentionSuggestions')}
            style={mentionsInputStyle}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={() => dispatch(entryActions.updateChatTyping(conversationId, false))}
          >
            <Mention
              appendSpaceOnAdd
              data={mentionUsers}
              displayTransform={(_, display) => `@${display}`}
              renderSuggestion={renderMentionSuggestion}
              className={styles.mention}
            />
          </MentionsInput>
        </div>
        <button
          type="button"
          aria-label={t('chat.sendMessage')}
          className={styles.sendButton}
          disabled={(!text.trim() && files.length === 0) || isDisabled}
          onClick={send}
        >
          <Send aria-hidden="true" size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});

MessageComposer.propTypes = {
  conversationId: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool,
};

MessageComposer.defaultProps = {
  isDisabled: false,
};

export default MessageComposer;
