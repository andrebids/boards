/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Form, Icon } from 'semantic-ui-react';
import { Button } from '../../../lib/custom-ui';
import { useClickAwayListener } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { useForm } from '../../../hooks';
import MarkdownEditor from '../../common/MarkdownEditor';
import { uploadCommentImage } from '../../comments/Comments/image-upload';

import styles from './AddTask.module.scss';

const DEFAULT_DATA = {
  content: '',
};

const MAX_LENGTH = 1048576;

const AddTask = React.memo((props) => {
  const { children, taskListId, parentTaskId, parentTaskName, isOpened, onClose } = props;
  const defaultMode = useSelector((state) => selectors.selectCurrentUser(state).defaultEditorMode);
  const boardMemberships = useSelector(selectors.selectMembershipsForCurrentBoard);
  const accessToken = useSelector(selectors.selectAccessToken);
  const { cardId } = useSelector(selectors.selectPath);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [data, , setData] = useForm(DEFAULT_DATA);
  const [editorKey, setEditorKey] = useState(0);

  const editorShellRef = useRef(null);
  const buttonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  const isExceeded = data.content.length > MAX_LENGTH;
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
    const content = data.content.trim();

    if (!content || isExceeded) {
      return;
    }

    dispatch(
      entryActions.createTask(taskListId, {
        content,
        name: content.slice(0, 1024),
        parentTaskId,
      }),
    );

    setData(DEFAULT_DATA);
    setEditorKey((key) => key + 1);
  }, [data.content, dispatch, isExceeded, parentTaskId, setData, taskListId]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleEditorChange = useCallback(
    (content) => {
      setData({ content });
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
    [editorShellRef, buttonRef, cancelButtonRef],
    onClose,
    handleClickAwayCancel,
  );

  if (!isOpened) {
    return children;
  }

  return (
    <Form className={styles.wrapper} onSubmit={handleSubmit}>
      {parentTaskId && (
        <div className={styles.context} title={parentTaskName}>
          <Icon fitted name="level down alternate" className={styles.contextIcon} />
          <span className={styles.contextText}>
            {t('common.newSubtaskOf', { task: parentTaskName })}
          </span>
        </div>
      )}
      <div
        {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
        ref={editorShellRef}
        className={styles.editorShell}
      >
        <MarkdownEditor
          key={editorKey}
          defaultValue={data.content}
          defaultMode={defaultMode}
          mentionUsers={mentionUsers}
          withEmoji
          fileUploadHandler={handleFileUpload}
          isError={isExceeded}
          onChange={handleEditorChange}
          onSubmit={handleSubmit}
          onCancel={onClose}
          onModeChange={handleModeChange}
        />
      </div>
      <div className={styles.controls}>
        <Button
          {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
          variant="primary"
          ref={buttonRef}
          content={
            isExceeded
              ? t('common.contentExceedsLimit', { limit: '1MB' })
              : t(parentTaskId ? 'action.addSubtask' : 'action.addTask')
          }
          disabled={!data.content.trim() || isExceeded}
          className={styles.submitButton}
        />
        {parentTaskId && (
          <Button
            {...clickAwayProps} // eslint-disable-line react/jsx-props-no-spreading
            variant="secondary"
            type="button"
            ref={cancelButtonRef}
            content={t('action.cancel')}
            className={styles.cancelButton}
            onClick={onClose}
          />
        )}
      </div>
    </Form>
  );
});

AddTask.propTypes = {
  children: PropTypes.element.isRequired,
  taskListId: PropTypes.string.isRequired,
  parentTaskId: PropTypes.string,
  parentTaskName: PropTypes.string,
  isOpened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

AddTask.defaultProps = {
  parentTaskId: undefined,
  parentTaskName: undefined,
};

export default AddTask;
