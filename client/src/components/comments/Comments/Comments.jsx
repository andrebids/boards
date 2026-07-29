/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useInView } from "react-intersection-observer";
import { Comment, Loader } from "semantic-ui-react";

import selectors from "../../../selectors";
import entryActions from "../../../entry-actions";
import { isListArchiveOrTrash } from "../../../utils/record-helpers";
import { BoardMembershipRoles } from "../../../constants/Enums";
import Item from "./Item";
import Add from "./Add";

import styles from "./Comments.module.scss";

const Comments = React.memo(() => {
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);

  const commentIds = useSelector(selectors.selectCommentIdsForCurrentCard);
  const { isCommentsFetching, isAllCommentsFetched } = useSelector(
    selectors.selectCurrentCard,
  );

  const cadAdd = useSelector((state) => {
    const { listId } = selectors.selectCurrentCard(state);
    const list = selectListById(state, listId);

    if (isListArchiveOrTrash(list)) {
      return false;
    }

    const boardMembership =
      selectors.selectCurrentUserMembershipForCurrentBoard(state);

    let isMember = false;
    let isEditor = false;

    if (boardMembership) {
      isMember = true;
      isEditor = boardMembership.role === BoardMembershipRoles.EDITOR;
    }

    return isEditor || (isMember && boardMembership.canComment);
  });

  const dispatch = useDispatch();

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
  }, [
    commentIds.length,
    dispatch,
    inView,
    isAllCommentsFetched,
    isCommentsFetching,
  ]);

  const hasComments = commentIds.length > 0;
  const shouldShowTimeline = hasComments || isCommentsFetching;
  const shouldShowLoader =
    isCommentsFetching || (hasComments && isAllCommentsFetched === false);

  return (
    <div className={styles.conversation}>
      {cadAdd && (
        <div className={styles.composer}>
          <Add />
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
              ref={
                !isCommentsFetching && !isAllCommentsFetched
                  ? inViewRef
                  : undefined
              }
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
