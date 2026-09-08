import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Paperclip, Send, Smile, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CloseButton } from '../../../lib/custom-ui';
import entryActions from '../../../entry-actions';
import selectors from '../../../selectors';
import FilePicker from '../../../lib/custom-ui/components/FilePicker/FilePicker';
import MessageTextInput from './MessageTextInput';
import LazyEmojiPicker, {
  EMOJI_CATEGORY_ICONS,
  EMOJI_PICKER_CLASS_NAME,
  EMOJI_PICKER_HEIGHT,
  EMOJI_PICKER_WIDTH,
} from '../LazyEmojiPicker';
import { getClipboardImageFiles, prepareChatAttachmentFiles } from '../utils';
import {
  CHAT_ATTACHMENT_ACCEPT,
  getChatAttachmentMaxBytes,
  isChatAttachmentAllowed,
  isChatPsdAttachment,
  isChatAttachmentTooLarge,
  isChatVideoAttachment,
} from '../attachmentPolicy';

import styles from './MessageComposer.module.scss';

const MessageComposer = React.memo((props) => {
  const { autoFocus, conversationId, isDisabled, onFilesDropHandlerChange } = props;
  const [t] = useTranslation();
  const [files, setFiles] = useState([]);
  const [attachmentPreparationCount, setAttachmentPreparationCount] = useState(0);
  const [attachmentError, setAttachmentError] = useState(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const toolsRef = useRef(null);
  const inputRef = useRef(null);
  const hasAutoFocusedRef = useRef(false);
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
  const { attachmentLimits = {} } = useSelector(selectors.selectConfig) || {};
  const send = useCallback(() => {
    const normalizedText = text.trim();

    if ((!normalizedText && files.length === 0) || attachmentPreparationCount > 0 || isDisabled) {
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
  }, [
    attachmentPreparationCount,
    conversationId,
    dispatch,
    files,
    isDisabled,
    replyTarget?.id,
    text,
  ]);

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
  const handleFilesSelect = useCallback(
    async (selectedFiles) => {
      const candidateFiles = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
      const typeAllowedFiles = candidateFiles.filter(isChatAttachmentAllowed);
      const oversizedFiles = typeAllowedFiles.filter((file) =>
        isChatAttachmentTooLarge(file, attachmentLimits),
      );
      const allowedFiles = typeAllowedFiles.filter(
        (file) => !isChatAttachmentTooLarge(file, attachmentLimits),
      );

      const errors = [];
      if (typeAllowedFiles.length !== candidateFiles.length) {
        errors.push(t('chat.unsupportedAttachmentType'));
      }
      if (oversizedFiles.length > 0) {
        if (oversizedFiles.some(isChatPsdAttachment)) {
          const file = oversizedFiles.find(isChatPsdAttachment);
          errors.push(
            t('chat.psdAttachmentTooLarge', {
              size: Math.floor(getChatAttachmentMaxBytes(file, attachmentLimits) / 1048576),
            }),
          );
        }
        if (oversizedFiles.some(isChatVideoAttachment)) {
          const file = oversizedFiles.find(isChatVideoAttachment);
          errors.push(
            t('chat.videoAttachmentTooLarge', {
              size: Math.floor(getChatAttachmentMaxBytes(file, attachmentLimits) / 1048576),
            }),
          );
        }
        if (
          oversizedFiles.some((file) => !isChatPsdAttachment(file) && !isChatVideoAttachment(file))
        ) {
          const file = oversizedFiles.find(
            (candidate) => !isChatPsdAttachment(candidate) && !isChatVideoAttachment(candidate),
          );
          errors.push(
            t('chat.attachmentTooLarge', {
              size: Math.floor(getChatAttachmentMaxBytes(file, attachmentLimits) / 1048576),
            }),
          );
        }
      }

      setAttachmentError(errors.length > 0 ? errors.join(' ') : null);
      setIsAttachmentMenuOpen(false);

      if (allowedFiles.length === 0) {
        return;
      }

      setAttachmentPreparationCount((count) => count + 1);
      try {
        const preparedFiles = await prepareChatAttachmentFiles(allowedFiles);
        setFiles((currentFiles) => [...currentFiles, ...preparedFiles]);
      } finally {
        setAttachmentPreparationCount((count) => Math.max(0, count - 1));
      }
    },
    [attachmentLimits, t],
  );
  const handlePaste = useCallback(
    (event) => {
      const pastedImages = getClipboardImageFiles(event.clipboardData);

      if (isDisabled || pastedImages.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleFilesSelect(pastedImages);
    },
    [handleFilesSelect, isDisabled],
  );
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

  useEffect(() => {
    if (!autoFocus || isDisabled || hasAutoFocusedRef.current) {
      return;
    }

    hasAutoFocusedRef.current = true;
    inputRef.current?.focus();
  }, [autoFocus, isDisabled]);

  useEffect(() => {
    if (!onFilesDropHandlerChange) {
      return undefined;
    }

    onFilesDropHandlerChange(handleFilesSelect);
    return () => onFilesDropHandlerChange(null);
  }, [handleFilesSelect, onFilesDropHandlerChange]);

  useEffect(
    () => () => {
      dispatch(entryActions.updateChatTyping(conversationId, false));
    },
    [conversationId, dispatch],
  );

  useEffect(() => {
    if (!isAttachmentMenuOpen && !isEmojiMenuOpen) {
      return undefined;
    }

    const closeOnOutsidePointerDown = (event) => {
      if (!toolsRef.current?.contains(event.target)) {
        setIsAttachmentMenuOpen(false);
        setIsEmojiMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true);
  }, [isAttachmentMenuOpen, isEmojiMenuOpen]);

  const cancelReply = useCallback(() => {
    dispatch(entryActions.setChatReplyTarget(conversationId, null));
  }, [conversationId, dispatch]);
  const replyAuthorName =
    members.find(({ id }) => id === replyTarget?.userId)?.name || t('chat.conversation');

  return (
    <div className={styles.wrapper}>
      {replyTarget && (
        <div className={styles.replyBar}>
          <span>
            <strong>{t('chat.replyingTo', { name: replyAuthorName })}</strong>
            <small>{replyTarget.deletedAt ? t('chat.messageDeleted') : replyTarget.text}</small>
          </span>
          <CloseButton ariaLabel={t('chat.cancelReply')} onClick={cancelReply} />
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
                <X aria-hidden="true" size={13} strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      )}
      {attachmentError && (
        <div className={styles.attachmentError} role="alert">
          {attachmentError}
        </div>
      )}
      <div className={styles.composerRow}>
        <div ref={toolsRef} className={styles.tools}>
          <button
            type="button"
            aria-label={t('chat.attachFiles')}
            aria-expanded={isAttachmentMenuOpen}
            disabled={isDisabled}
            onClick={() => {
              setIsAttachmentMenuOpen((isOpen) => !isOpen);
              setIsEmojiMenuOpen(false);
            }}
          >
            <Paperclip aria-hidden="true" size={17} strokeWidth={2} />
          </button>
          {isAttachmentMenuOpen && (
            <div className={styles.attachmentMenu} role="menu" aria-label={t('chat.attachFiles')}>
              <strong>{t('chat.attachFiles')}</strong>
              <span>{t('chat.dropOrPasteFiles')}</span>
              <FilePicker accept={CHAT_ATTACHMENT_ACCEPT} multiple onSelect={handleFilesSelect}>
                <button type="button" className={styles.attachmentMenuItem}>
                  <Upload aria-hidden="true" size={16} strokeWidth={2} />
                  {t('chat.uploadFromDevice')}
                </button>
              </FilePicker>
            </div>
          )}
          <button
            type="button"
            aria-label={t('chat.addEmoji')}
            disabled={isDisabled}
            onClick={() => {
              setIsEmojiMenuOpen((isOpen) => !isOpen);
              setIsAttachmentMenuOpen(false);
            }}
          >
            <Smile aria-hidden="true" size={20} strokeWidth={1.9} />
          </button>
          {isEmojiMenuOpen && (
            <div className={styles.emojiMenu} role="menu" aria-label={t('chat.chooseEmoji')}>
              <Suspense fallback={null}>
                <LazyEmojiPicker
                  categoryIcons={EMOJI_CATEGORY_ICONS}
                  className={EMOJI_PICKER_CLASS_NAME}
                  theme="dark"
                  width={EMOJI_PICKER_WIDTH}
                  height={EMOJI_PICKER_HEIGHT}
                  previewConfig={{ showPreview: false }}
                  searchPlaceholder={t('chat.searchEmoji')}
                  onEmojiClick={handleEmojiClick}
                />
              </Suspense>
            </div>
          )}
        </div>
        <div className={styles.inputShell}>
          <MessageTextInput
            conversationId={conversationId}
            inputRef={inputRef}
            value={text}
            disabled={isDisabled}
            aria-label={t('chat.writeMessage')}
            placeholder={isDisabled ? t('chat.conversationUnavailable') : t('chat.writeMessage')}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => dispatch(entryActions.updateChatTyping(conversationId, false))}
          />
        </div>
        <button
          type="button"
          aria-label={t('chat.sendMessage')}
          className={styles.sendButton}
          disabled={
            (!text.trim() && files.length === 0) || attachmentPreparationCount > 0 || isDisabled
          }
          onClick={send}
        >
          <Send aria-hidden="true" size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});

MessageComposer.propTypes = {
  autoFocus: PropTypes.bool,
  conversationId: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool,
  onFilesDropHandlerChange: PropTypes.func,
};

MessageComposer.defaultProps = {
  autoFocus: false,
  isDisabled: false,
  onFilesDropHandlerChange: undefined,
};

export default MessageComposer;
