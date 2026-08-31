/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Comment } from 'semantic-ui-react';
import { Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { useDidUpdate } from '../../../lib/hooks';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { usePopupInClosableContext } from '../../../hooks';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { BoardMembershipRoles } from '../../../constants/Enums';
import { ClosableContext } from '../../../contexts';
import Edit from './Edit';
import Markdown from '../../common/Markdown';
import ConfirmationStep from '../../common/ConfirmationStep';
import UserAvatar from '../../users/UserAvatar';
import LazyEmojiPicker, {
  EMOJI_CATEGORY_ICONS,
  EMOJI_PICKER_CLASS_NAME,
  EMOJI_PICKER_HEIGHT,
  EMOJI_PICKER_WIDTH,
} from '../../chat/LazyEmojiPicker';
import { getReactionEmojiPickerPosition, QUICK_REACTION_EMOJIS } from '../../chat/reaction-utils';
import {
  formatMessageDay,
  formatMessageTime,
  isSameDay,
} from '../../chat/MessageList/message-view';

import styles from './Item.module.scss';

const GROUP_WINDOW = 5 * 60 * 1000;

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

  const currentUserId = useSelector(selectors.selectCurrentUserId);
  const isCurrentUser = comment.userId === currentUserId;

  const { canEdit, canDelete, canReact } = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return {
        canEdit: false,
        canDelete: false,
        canReact: false,
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
      canReact: isMember && (isEditor || boardMembership.canComment),
    };
  }, shallowEqual);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const [isEditOpened, setIsEditOpened] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
  const reactionPickerRef = useRef(null);
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

  const handleReactionClick = useCallback(
    (emoji) => {
      dispatch(entryActions.toggleCommentReaction(id, emoji));
      setReactionPickerPosition(null);
    },
    [dispatch, id],
  );

  const handleReactionPickerToggle = useCallback((event) => {
    setReactionPickerPosition((position) =>
      position
        ? null
        : getReactionEmojiPickerPosition(
            event.currentTarget,
            EMOJI_PICKER_WIDTH,
            EMOJI_PICKER_HEIGHT,
          ),
    );
  }, []);

  useEffect(() => {
    if (!reactionPickerPosition) {
      return undefined;
    }

    const closePicker = (event) => {
      if (event?.target instanceof Node && reactionPickerRef.current?.contains(event.target)) {
        return;
      }
      setReactionPickerPosition(null);
    };
    const closeOnOutsidePointerDown = (event) => {
      if (event.target instanceof Node && !reactionPickerRef.current?.contains(event.target)) {
        closePicker();
      }
    };

    window.addEventListener('resize', closePicker);
    window.addEventListener('scroll', closePicker, true);
    document.addEventListener('pointerdown', closeOnOutsidePointerDown, true);

    return () => {
      window.removeEventListener('resize', closePicker);
      window.removeEventListener('scroll', closePicker, true);
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true);
    };
  }, [reactionPickerPosition]);

  useDidUpdate(() => {
    setIsClosableActive(isEditOpened);
  }, [isEditOpened]);

  const ConfirmationPopup = usePopupInClosableContext(ConfirmationStep);
  const continuesAbove = areCommentsGrouped(aboveComment, comment);
  const continuesBelow = areCommentsGrouped(comment, belowComment);
  const startsNewDay = !aboveComment || !isSameDay(aboveComment.createdAt, comment.createdAt);
  const userName =
    user.id === StaticUserIds.DELETED
      ? t(`common.${user.name}`, {
          context: 'title',
        })
      : user.name;
  const commentDate = new Date(comment.createdAt);
  const commentTimestampTitle = t('format:fullDateTime', {
    value: commentDate,
    postProcess: 'formatDate',
  });
  const reactions = comment.reactions || [];

  const commentElement = (
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
            {!isCurrentUser && <span className={styles.author}>{userName}</span>}
            <span className={styles.date}>
              <time dateTime={commentDate.toISOString()} title={commentTimestampTitle}>
                {formatMessageTime(comment.createdAt)}
              </time>
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
            {(canReact || canEdit || canDelete) && (
              <span
                className={classNames(styles.actions, reactionPickerPosition && styles.actionsOpen)}
                role="group"
                aria-label={t('chat.messageActions')}
              >
                {canReact &&
                  QUICK_REACTION_EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      className={styles.quickReactionButton}
                      aria-label={`${t('chat.addEmoji')}: ${emoji}`}
                      disabled={!comment.isPersisted}
                      onClick={() => handleReactionClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                {canReact && (
                  <span className={styles.reactionControl}>
                    <button
                      type="button"
                      aria-label={t('chat.addEmoji')}
                      title={t('chat.addEmoji')}
                      disabled={!comment.isPersisted}
                      onClick={handleReactionPickerToggle}
                    >
                      <SmilePlus aria-hidden="true" size={15} />
                    </button>
                    {reactionPickerPosition &&
                      document.getElementById('app') &&
                      createPortal(
                        <div
                          ref={reactionPickerRef}
                          className={styles.floatingReactionEmojiMenu}
                          style={reactionPickerPosition}
                        >
                          <Suspense fallback={null}>
                            <LazyEmojiPicker
                              categoryIcons={EMOJI_CATEGORY_ICONS}
                              className={EMOJI_PICKER_CLASS_NAME}
                              theme="dark"
                              width={EMOJI_PICKER_WIDTH}
                              height={EMOJI_PICKER_HEIGHT}
                              previewConfig={{ showPreview: false }}
                              searchPlaceholder={t('chat.searchEmoji')}
                              onEmojiClick={(emojiData) => handleReactionClick(emojiData.emoji)}
                            />
                          </Suspense>
                        </div>,
                        document.getElementById('app'),
                      )}
                  </span>
                )}
                {canReact && (canEdit || canDelete) && (
                  <span className={styles.actionDivider} aria-hidden="true" />
                )}
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
            {(reactions.length > 0 || canReact) && (
              <div
                className={classNames(
                  styles.reactions,
                  reactions.length === 0 && styles.mobileOnlyReactions,
                )}
              >
                {reactions.map((reaction) => (
                  <button
                    type="button"
                    key={reaction.emoji}
                    className={classNames(
                      reaction.userIds.includes(currentUserId) && styles.reacted,
                    )}
                    disabled={!canReact || !comment.isPersisted}
                    aria-label={`${t('chat.addEmoji')}: ${reaction.emoji}`}
                    onClick={() => handleReactionClick(reaction.emoji)}
                  >
                    {reaction.emoji} {reaction.userIds.length}
                  </button>
                ))}
                {canReact && (
                  <button
                    type="button"
                    className={styles.mobileReactionButton}
                    disabled={!comment.isPersisted}
                    aria-label={t('chat.addEmoji')}
                    title={t('chat.addEmoji')}
                    onClick={handleReactionPickerToggle}
                  >
                    <SmilePlus aria-hidden="true" size={14} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Comment>
  );

  if (!startsNewDay) {
    return commentElement;
  }

  return (
    <>
      <div className={styles.dayDivider}>
        <span>{formatMessageDay(comment.createdAt)}</span>
      </div>
      {commentElement}
    </>
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
