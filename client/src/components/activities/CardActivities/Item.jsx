/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Comment } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { ActivityTypes } from '../../../constants/Enums';
import TimeAgo from '../../common/TimeAgo';
import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(({ id }) => {
  const selectActivityById = useMemo(
    () => selectors.makeSelectActivityById(),
    []
  );
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

  const activity = useSelector(state => selectActivityById(state, id));
  const user = useSelector(state => selectUserById(state, activity.userId));

  const [t] = useTranslation();

  const userName =
    user.id === StaticUserIds.DELETED
      ? t(`common.${user.name}`, {
          context: 'title',
        })
      : user.name;

  let contentNode;
  switch (activity.type) {
    case ActivityTypes.CREATE_CARD: {
      const { list } = activity.data;
      const listName = list.name || t(`common.${list.type}`);

      contentNode = (
        <Trans
          i18nKey="common.userAddedThisCardToList"
          values={{
            user: userName,
            list: listName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' added this card to '}
          {listName}
        </Trans>
      );

      break;
    }
    case ActivityTypes.MOVE_CARD: {
      const { fromList, toList } = activity.data;

      const fromListName = fromList.name || t(`common.${fromList.type}`);
      const toListName = toList.name || t(`common.${toList.type}`);

      contentNode = (
        <Trans
          i18nKey="common.userMovedThisCardFromListToList"
          values={{
            user: userName,
            fromList: fromListName,
            toList: toListName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' moved this card from '}
          {fromListName}
          {' to '}
          {toListName}
        </Trans>
      );

      break;
    }
    case ActivityTypes.ADD_MEMBER_TO_CARD:
      contentNode =
        user.id === activity.data.user.id ? (
          <Trans
            i18nKey="common.userJoinedThisCard"
            values={{
              user: userName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' joined this card'}
          </Trans>
        ) : (
          <Trans
            i18nKey="common.userAddedUserToThisCard"
            values={{
              actorUser: userName,
              addedUser: activity.data.user.name,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' added '}
            {activity.data.user.name}
            {' to this card'}
          </Trans>
        );

      break;
    case ActivityTypes.REMOVE_MEMBER_FROM_CARD:
      contentNode =
        user.id === activity.data.user.id ? (
          <Trans
            i18nKey="common.userLeftThisCard"
            values={{
              user: userName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' left this card'}
          </Trans>
        ) : (
          <Trans
            i18nKey="common.userRemovedUserFromThisCard"
            values={{
              actorUser: userName,
              removedUser: activity.data.user.name,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' removed '}
            {activity.data.user.name}
            {' from this card'}
          </Trans>
        );

      break;
    case ActivityTypes.COMPLETE_TASK:
      contentNode = (
        <Trans
          i18nKey="common.userCompletedTaskOnThisCard"
          values={{
            user: userName,
            task: activity.data.task.name,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' completed '}
          {activity.data.task.name}
          {' on this card'}
        </Trans>
      );

      break;
    case ActivityTypes.UNCOMPLETE_TASK:
      contentNode = (
        <Trans
          i18nKey="common.userMarkedTaskIncompleteOnThisCard"
          values={{
            user: userName,
            task: activity.data.task.name,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' marked '}
          {activity.data.task.name}
          {' incomplete on this card'}
        </Trans>
      );

      break;
    case ActivityTypes.COMMENT_CREATE:
    case ActivityTypes.COMMENT_UPDATE:
    case ActivityTypes.COMMENT_DELETE:
    case ActivityTypes.COMMENT_REPLY: {
      // Extrair dados com verificações de segurança
      const { commentText, cardName: activityCardName, mentions, isReply, action } = activity.data || {};

      // Usar traduções existentes
      let translationKey;
      switch (action) {
        case 'create':
          translationKey = isReply ? 'common.userRepliedToCommentOnCard' : 'common.userCommentedOnCard';
          break;
        case 'update':
          translationKey = 'common.userUpdatedCommentOnCard';
          break;
        case 'delete':
          translationKey = 'common.userDeletedCommentOnCard';
          break;
        case 'reply':
          translationKey = 'common.userRepliedToCommentOnCard';
          break;
        default:
          translationKey = 'common.userCommentedOnCard';
      }

      contentNode = (
        <Trans
          i18nKey={translationKey}
          values={{
            user: userName,
            card: activityCardName || 'este cartão',
          }}
        >
          <span className={styles.author}>{userName}</span>
          {action === 'create' && !isReply && ' comentou no cartão '}
          {action === 'create' && isReply && ' respondeu a um comentário no cartão '}
          {action === 'update' && ' editou comentário no cartão '}
          {action === 'delete' && ' removeu comentário no cartão '}
          {action === 'reply' && ' respondeu a um comentário no cartão '}
          <span className={styles.cardName}>
            {activityCardName || 'este cartão'}
          </span>
        </Trans>
      );

      // Adicionar texto do comentário ao contentNode
      if (action !== 'delete' && commentText) {
        contentNode = (
          <>
            {contentNode}
            <div className={styles.commentText}>
              <div className={styles.commentContent}>
                {commentText}
              </div>
              {mentions && mentions.length > 0 && (
                <div className={styles.mentions}>
                  {mentions.map((mention, index) => (
                    <span key={index} className={styles.mention}>
                      @{mention}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      }

      if (action === 'delete') {
        contentNode = (
          <>
            {contentNode}
            <div className={styles.deletedComment}>
              <em>[Comentário removido]</em>
            </div>
          </>
        );
      }

      break;
    }
    default:
      contentNode = null;
  }

  return (
    <Comment>
      <span className={styles.user}>
        <UserAvatar id={activity.userId} />
      </span>
      <div className={styles.content}>
        <div>{contentNode}</div>
        <span className={styles.date}>
          <TimeAgo date={activity.createdAt} />
        </span>
      </div>
    </Comment>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Item;
