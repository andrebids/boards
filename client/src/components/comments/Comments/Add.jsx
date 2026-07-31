/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Form } from 'semantic-ui-react';
import { useClickAwayListener } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';
import MarkdownEditor from '../../common/MarkdownEditor';

import styles from './Add.module.scss';

const MAX_LENGTH = 1048576;

const DEFAULT_DATA = {
  text: '',
};

const Add = React.memo(({ onSubmit }) => {
  const defaultMode = useSelector((state) => selectors.selectCurrentUser(state).defaultEditorMode);
  const boardMemberships = useSelector(selectors.selectMembershipsForCurrentBoard);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [data, , setData] = useForm(DEFAULT_DATA);
  const [isOpened, setIsOpened] = useState(false);

  const editorShellRef = useRef(null);
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
  }, [dispatch, data, isExceeded, onSubmit, setData]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleOpen = useCallback(() => {
    setIsOpened(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpened(false);
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

  const handleClickAwayCancel = useCallback(() => {}, []);

  const clickAwayProps = useClickAwayListener(
    [editorShellRef, buttonRef],
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
              defaultValue={data.text}
              defaultMode={defaultMode}
              mentionUsers={mentionUsers}
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
