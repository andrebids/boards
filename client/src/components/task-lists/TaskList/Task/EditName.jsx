/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import selectors from '../../../../selectors';
import entryActions from '../../../../entry-actions';
import EditMarkdown from '../../../common/EditMarkdown';
import { uploadCommentImage } from '../../../comments/Comments/image-upload';

import styles from './EditName.module.scss';

const EditName = React.memo(({ taskId, onClose }) => {
  const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);
  const task = useSelector((state) => selectTaskById(state, taskId));
  const boardMemberships = useSelector(selectors.selectMembershipsForCurrentBoard);
  const accessToken = useSelector(selectors.selectAccessToken);
  const { cardId } = useSelector(selectors.selectPath);

  const dispatch = useDispatch();
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

  const handleUpdate = useCallback(
    (content) => {
      if (!content) {
        return;
      }

      dispatch(
        entryActions.updateTask(taskId, {
          content,
          name: content.slice(0, 1024),
        }),
      );
    },
    [dispatch, taskId],
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

  return (
    <div className={styles.wrapper}>
      <EditMarkdown
        defaultValue={task.content || task.name}
        mentionUsers={mentionUsers}
        withEmoji
        fileUploadHandler={handleFileUpload}
        onUpdate={handleUpdate}
        onClose={onClose}
      />
    </div>
  );
});

EditName.propTypes = {
  taskId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EditName;
