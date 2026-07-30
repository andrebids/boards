/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useInView } from 'react-intersection-observer';
import { Comment, Loader } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { isListArchiveOrTrash } from '../../../utils/record-helpers';
import { BoardMembershipRoles } from '../../../constants/Enums';
import Item from './Item';
import Add from './Add';

import styles from './Comments.module.scss';

const getScrollBehavior = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

const Comments = React.memo(() => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const commentIds = useSelector(selectors.selectCommentIdsForCurrentCard);
  const { isCommentsFetching, isAllCommentsFetched } = useSelector(selectors.selectCurrentCard);

  const cadAdd = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);

    let isMember = false;
    let isEditor = false;

    if (boardMembership) {
      isMember = true;
      isEditor = boardMembership.role === BoardMembershipRoles.EDITOR;
    }

    return isEditor || (isMember && boardMembership.canComment);
  });

  const dispatch = useDispatch();
  const conversationRef = useRef(null);
  const composerRef = useRef(null);
  const previousNewestCommentIdRef = useRef(commentIds[0]);
  const shouldRevealNewestCommentRef = useRef(false);

  const [inViewRef, inView] = useInView({
    threshold: 1,
  });

  useEffect(() => {
    if (
      !isCommentsFetching &&
      isAllCommentsFetched !== true &&
      (commentIds.length === 0 || inView)
    ) {
      dispatch(entryActions.fetchCommentsInCurrentCard());
    }
  }, [commentIds.length, dispatch, inView, isAllCommentsFetched, isCommentsFetching]);

  const newestCommentId = commentIds[0];

  const handleComposerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: getScrollBehavior(),
        block: 'nearest',
      });
    });
  }, []);

  const handleCommentSubmit = useCallback(() => {
    shouldRevealNewestCommentRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (
      shouldRevealNewestCommentRef.current &&
      newestCommentId &&
      previousNewestCommentIdRef.current !== newestCommentId
    ) {
      const newestCommentElement = conversationRef.current?.querySelector(
        `[data-comment-id="${newestCommentId}"]`,
      );

      newestCommentElement?.scrollIntoView({
        behavior: getScrollBehavior(),
        block: 'nearest',
      });
      shouldRevealNewestCommentRef.current = false;
    }

    previousNewestCommentIdRef.current = newestCommentId;
  }, [newestCommentId]);

  const hasComments = commentIds.length > 0;
  const shouldShowTimeline = hasComments || isCommentsFetching;
  const shouldShowLoader = isCommentsFetching || (hasComments && isAllCommentsFetched === false);

  return (
    <div ref={conversationRef} className={styles.conversation}>
      {cadAdd && (
        <div ref={composerRef} className={styles.composer} onFocusCapture={handleComposerFocus}>
          <Add onSubmit={handleCommentSubmit} />
        </div>
      )}
      {shouldShowTimeline && (
        <div className={styles.timeline}>
          <Comment.Group className={styles.items}>
            {commentIds.map((commentId, index) => (
              <Item
                key={commentId}
                id={commentId}
                aboveId={commentIds[index - 1]}
                belowId={commentIds[index + 1]}
              />
            ))}
          </Comment.Group>
          {shouldShowLoader && (
            <div
              ref={!isCommentsFetching && !isAllCommentsFetched ? inViewRef : undefined}
              className={styles.loaderWrapper}
            >
              {isCommentsFetching ? (
                <Loader active inverted inline="centered" size="small" />
              ) : (
                <span aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default Comments;
