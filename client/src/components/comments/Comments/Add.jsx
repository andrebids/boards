/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Send, Smile } from 'lucide-react';
import { Form } from 'semantic-ui-react';
import { useClickAwayListener } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';
import MarkdownEditor from '../../common/MarkdownEditor';
import LazyEmojiPicker, {
  EMOJI_CATEGORY_ICONS,
  EMOJI_PICKER_CLASS_NAME,
  EMOJI_PICKER_HEIGHT,
  EMOJI_PICKER_WIDTH,
} from '../../chat/LazyEmojiPicker';
import { uploadCommentImage } from './image-upload';

import styles from './Add.module.scss';

const MAX_LENGTH = 1048576;

const DEFAULT_DATA = {
  text: '',
};

const Add = React.memo(({ onSubmit }) => {
  const defaultMode = useSelector((state) => selectors.selectCurrentUser(state).defaultEditorMode);
  const boardMemberships = useSelector(selectors.selectMembershipsForCurrentBoard);
  const accessToken = useSelector(selectors.selectAccessToken);
  const { cardId } = useSelector(selectors.selectPath);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [data, , setData] = useForm(DEFAULT_DATA);
  const [isOpened, setIsOpened] = useState(false);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);

  const editorRef = useRef(null);
  const editorShellRef = useRef(null);
  const emojiRef = useRef(null);
  const buttonRef = useRef(null);

  const isExceeded = data.text.length > MAX_LENGTH;
  const mentionUsers = useMemo(
    () =>
      boardMemberships
        .filter(({ user }) => user)
        .map(({ user }) => ({
          id: user.id,
          display: user.username || user.name,
          name: user.name,
        })),
    [boardMemberships],
  );

  const submit = useCallback(() => {
    const cleanData = {
      ...data,
      text: data.text.trim(),
    };

    if (!cleanData.text || isExceeded) {
      return;
    }

    onSubmit();
    dispatch(entryActions.createCommentInCurrentCard(cleanData));
    setData(DEFAULT_DATA);
    setIsOpened(false);
    setIsEmojiMenuOpen(false);
  }, [dispatch, data, isExceeded, onSubmit, setData]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleOpen = useCallback(() => {
    setIsOpened(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpened(false);
    setIsEmojiMenuOpen(false);
  }, []);

  const handleEmojiClick = useCallback(({ emoji }) => {
    editorRef.current?.insertText(emoji);
    setIsEmojiMenuOpen(false);
  }, []);

  const handleEditorChange = useCallback(
    (text) => {
      setData({
        text,
      });
    },
    [setData],
  );

  const handleModeChange = useCallback(
    (mode) => {
      dispatch(
        entryActions.updateCurrentUser({
          defaultEditorMode: mode,
        }),
      );
    },
    [dispatch],
  );

  const handleFileUpload = useCallback(
    async (file) => {
      const { attachment, requestId, url } = await uploadCommentImage({
        cardId,
        accessToken,
        file,
      });

      dispatch(entryActions.handleAttachmentCreate(attachment, requestId));

      return { url };
    },
    [accessToken, cardId, dispatch],
  );

  const handleClickAwayCancel = useCallback(() => {}, []);

  const clickAwayProps = useClickAwayListener(
    [editorShellRef, emojiRef, buttonRef],
    handleClose,
    handleClickAwayCancel,
  );

  return (
    <Form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.composerRow}>
        {isOpened ? (
          <div
            {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
            ref={editorShellRef}
            className={styles.editorShell}
          >
            <MarkdownEditor
              ref={editorRef}
              defaultValue={data.text}
              defaultMode={defaultMode}
              mentionUsers={mentionUsers}
              fileUploadHandler={handleFileUpload}
              isError={isExceeded}
              onChange={handleEditorChange}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              onModeChange={handleModeChange}
            />
          </div>
        ) : (
          <button type="button" className={styles.openEditorButton} onClick={handleOpen}>
            {t('common.writeComment')}
          </button>
        )}
        <div
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          ref={emojiRef}
          className={styles.emojiControl}
        >
          <button
            type="button"
            aria-label={t('chat.addEmoji')}
            aria-expanded={isEmojiMenuOpen}
            title={t('chat.addEmoji')}
            className={styles.emojiButton}
            onClick={() => {
              setIsOpened(true);
              setIsEmojiMenuOpen((isOpen) => !isOpen);
            }}
          >
            <Smile aria-hidden="true" size={19} strokeWidth={1.9} />
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
        <button
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          ref={buttonRef}
          type="submit"
          aria-label={t('action.addComment')}
          title={t('action.addComment')}
          className={styles.sendButton}
          disabled={!data.text.trim() || isExceeded}
        >
          <Send aria-hidden="true" size={17} strokeWidth={2} />
        </button>
      </div>
    </Form>
  );
});

Add.propTypes = {
  onSubmit: PropTypes.func,
};

Add.defaultProps = {
  onSubmit: () => {},
};

export default Add;
