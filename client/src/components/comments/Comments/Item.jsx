/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Comment } from 'semantic-ui-react';
import { Pencil, Trash2 } from 'lucide-react';
import { useDidUpdate } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { BoardMembershipRoles } from '../../../constants/Enums';
import { ClosableContext } from '../../../contexts';
import Edit from './Edit';
import TimeAgo from '../../common/TimeAgo';
import Markdown from '../../common/Markdown';
import ConfirmationStep from '../../common/ConfirmationStep';
import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const GROUP_WINDOW = 5 * 60 * 1000;

const isSameDay = (firstDate, secondDate) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

const areCommentsGrouped = (newerComment, olderComment) => {
  if (!newerComment || !olderComment || newerComment.userId !== olderComment.userId) {
    return false;
  }

  const newerDate = new Date(newerComment.createdAt);
  const olderDate = new Date(olderComment.createdAt);
  const difference = newerDate - olderDate;

  return (
    !Number.isNaN(newerDate.getTime()) &&
    !Number.isNaN(olderDate.getTime()) &&
    isSameDay(newerDate, olderDate) &&
    difference >= 0 &&
    difference < GROUP_WINDOW
  );
};

const Item = React.memo(({ id, aboveId, belowId }) => {
  const selectCommentById = useMemo(() => selectors.makeSelectCommentById(), []);
  const selectAboveCommentById = useMemo(() => selectors.makeSelectCommentById(), []);
  const selectBelowCommentById = useMemo(() => selectors.makeSelectCommentById(), []);
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const comment = useSelector((state) => selectCommentById(state, id));
  const aboveComment = useSelector((state) =>
    aboveId ? selectAboveCommentById(state, aboveId) : null,
  );
  const belowComment = useSelector((state) =>
    belowId ? selectBelowCommentById(state, belowId) : null,
  );
  const user = useSelector((state) => selectUserById(state, comment.userId));

  const isCurrentUser = useSelector(
    (state) => comment.userId === selectors.selectCurrentUserId(state),
  );

  const { canEdit, canDelete } = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return {
        canEdit: false,
        canDelete: false,
      };
    }

    const isManager = selectors.selectIsCurrentUserManagerForCurrentProject(state);
    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    let isMember = false;
    let isEditor = false;

    if (boardMembership) {
      isMember = true;
      isEditor = boardMembership.role === BoardMembershipRoles.EDITOR;
    }

    return {
      canEdit:
        isMember &&
        comment.userId === boardMembership.userId &&
        (isEditor || boardMembership.canComment),
      canDelete:
        isManager ||
        isEditor ||
        (isMember && comment.userId === boardMembership.userId && boardMembership.canComment),
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isEditOpened, setIsEditOpened] = useState(false);
  const [, , setIsClosableActive] = useContext(ClosableContext);

  const handleDeleteConfirm = useCallback(() => {
    dispatch(entryActions.deleteComment(id));
  }, [id, dispatch]);

  const handleEditClick = useCallback(() => {
    setIsEditOpened(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setIsEditOpened(false);
  }, []);

  useDidUpdate(() => {
    setIsClosableActive(isEditOpened);
  }, [isEditOpened]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);
  const continuesAbove = areCommentsGrouped(aboveComment, comment);
  const continuesBelow = areCommentsGrouped(comment, belowComment);
  const userName =
    user.id === StaticUserIds.DELETED
      ? t(`common.${user.name}`, {
          context: 'title',
        })
      : user.name;

  return (
    <Comment
      data-comment-id={id}
      className={classNames(
        styles.item,
        isCurrentUser && styles.own,
        continuesAbove && styles.continuesAbove,
        continuesBelow && styles.continuesBelow,
      )}
    >
      {!isCurrentUser &&
        (continuesAbove ? (
          <span className={styles.avatarSpacer} />
        ) : (
          <span className={styles.avatar}>
            <UserAvatar id={comment.userId} size="tiny" />
          </span>
        ))}
      <div className={classNames(styles.content, isEditOpened && styles.contentEditing)}>
        {!continuesAbove && (
          <div className={styles.meta}>
            {!isCurrentUser && (
              <>
                <span className={styles.author}>{userName}</span>
                <span aria-hidden="true" className={styles.metaSeparator}>
                  ·
                </span>
              </>
            )}
            <span className={styles.date}>
              <TimeAgo date={comment.createdAt} />
            </span>
          </div>
        )}
        {isEditOpened ? (
          <Edit commentId={id} onClose={handleEditClose} />
        ) : (
          <>
            <div className={styles.bubble}>
              <Markdown>{comment.text}</Markdown>
            </div>
            {(canEdit || canDelete) && (
              <span className={styles.actions}>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={t('action.edit')}
                    title={t('action.edit')}
                    disabled={!comment.isPersisted}
                    onClick={handleEditClick}
                  >
                    <Pencil aria-hidden="true" size={14} strokeWidth={2} />
                  </button>
                )}
                {canDelete && (
                  <ConfirmationPopup
                    title="common.deleteComment"
                    content="common.areYouSureYouWantToDeleteThisComment"
                    buttonContent="action.deleteComment"
                    onConfirm={handleDeleteConfirm}
                  >
                    <button
                      type="button"
                      aria-label={t('action.delete')}
                      title={t('action.delete')}
                      disabled={!comment.isPersisted}
                      className={styles.deleteButton}
                    >
                      <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                    </button>
                  </ConfirmationPopup>
                )}
              </span>
            )}
          </>
        )}
      </div>
    </Comment>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  aboveId: PropTypes.string,
  belowId: PropTypes.string,
};

Item.defaultProps = {
  aboveId: undefined,
  belowId: undefined,
};

export default Item;
