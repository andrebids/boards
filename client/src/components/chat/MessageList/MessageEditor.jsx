import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import entryActions from '../../../entry-actions';
import { Button } from '../../../lib/custom-ui';
import MessageTextInput from '../MessageComposer/MessageTextInput';
import styles from './MessageList.module.scss';

const MessageEditor = React.memo(
  ({ conversationId, message, text, isDisabled, onChange, onClose }) => {
    const [t] = useTranslation();
    const dispatch = useDispatch();
    const inputRef = useRef(null);
    const editorRef = useRef(null);
    const [submittedText, setSubmittedText] = useState(null);
    const normalizedText = text.trim();
    const canSave =
      !isDisabled &&
      !message.isUpdating &&
      normalizedText.length > 0 &&
      normalizedText.length <= 10000 &&
      normalizedText !== (message.text || '').trim();

    useEffect(() => {
      const input = inputRef.current;
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(input.value.length, input.value.length);
    }, []);

    useLayoutEffect(() => {
      const editor = editorRef.current;
      const list = editor?.closest('[data-chat-message-list]');
      if (!list) return;
      const editorBounds = editor.getBoundingClientRect();
      const listBounds = list.getBoundingClientRect();
      if (editorBounds.bottom > listBounds.bottom) {
        list.scrollTop += editorBounds.bottom - listBounds.bottom;
      } else if (editorBounds.top < listBounds.top) {
        list.scrollTop += editorBounds.top - listBounds.top;
      }
    }, [text, message.editError]);

    useEffect(() => {
      if (
        submittedText !== null &&
        !message.isUpdating &&
        !message.editError &&
        message.text === submittedText
      ) {
        onClose();
      }
    }, [message.editError, message.isUpdating, message.text, onClose, submittedText]);

    const save = () => {
      if (!canSave) return;
      setSubmittedText(normalizedText);
      dispatch(entryActions.updateChatMessage(message.id, { text: normalizedText }));
    };

    return (
      <div ref={editorRef} className={styles.inlineEditor} aria-busy={Boolean(message.isUpdating)}>
        <div className={styles.editorInput}>
          <MessageTextInput
            isEditing
            conversationId={conversationId}
            inputRef={inputRef}
            value={text}
            readOnly={isDisabled || message.isUpdating}
            aria-label={t('chat.editMessage')}
            onChange={(_, value) => onChange(value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === 'Escape' && !message.isUpdating) {
                event.preventDefault();
                onClose();
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                save();
              }
            }}
          />
        </div>
        {submittedText !== null && message.editError && (
          <div className={styles.editError} role="alert">
            {t('chat.editMessageFailed')}
          </div>
        )}
        {isDisabled && <div role="status">{t('chat.conversationUnavailable')}</div>}
        <div className={styles.editorActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={message.isUpdating}
            onClick={onClose}
          >
            {t('chat.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!canSave}
            isPending={message.isUpdating}
            onClick={save}
          >
            {t(message.isUpdating ? 'chat.savingMessage' : 'chat.save')}
          </Button>
        </div>
      </div>
    );
  },
);

MessageEditor.propTypes = {
  conversationId: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string,
    isUpdating: PropTypes.bool,
    editError: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  }).isRequired,
  isDisabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MessageEditor;
