/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../selectors';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { ActivityTypes } from '../../../constants/Enums';
import { formatTextWithMentions } from '../../../utils/mentions';
import TimeAgo from '../../common/TimeAgo';

import styles from './Item.module.scss';

const IconByType = {
  [ActivityTypes.CREATE_CARD]: 'plus',
  [ActivityTypes.MOVE_CARD]: 'share square outline',
  [ActivityTypes.ADD_MEMBER_TO_CARD]: 'add user',
  [ActivityTypes.REMOVE_MEMBER_FROM_CARD]: 'user outline',
  [ActivityTypes.COMPLETE_TASK]: 'check',
  [ActivityTypes.UNCOMPLETE_TASK]: 'undo alternate',
  [ActivityTypes.CREATE_TASK]: 'check square outline',
  [ActivityTypes.DELETE_TASK]: 'trash alternate outline',
  [ActivityTypes.UPDATE_TASK]: 'pencil',
  [ActivityTypes.CREATE_TASK_LIST]: 'list ul',
  [ActivityTypes.DELETE_TASK_LIST]: 'trash alternate outline',
  [ActivityTypes.CREATE_ATTACHMENT]: 'attach',
  [ActivityTypes.DELETE_ATTACHMENT]: 'trash alternate outline',
  [ActivityTypes.SET_DUE_DATE]: 'calendar check outline',
  [ActivityTypes.COMMENT_CREATE]: 'comment outline',
  [ActivityTypes.COMMENT_UPDATE]: 'pencil',
  [ActivityTypes.COMMENT_DELETE]: 'trash alternate outline',
  [ActivityTypes.COMMENT_REPLY]: 'reply',
  [ActivityTypes.ADD_LABEL_TO_CARD]: 'bookmark outline',
  [ActivityTypes.REMOVE_LABEL_FROM_CARD]: 'bookmark outline',
};

const ACCENT_TYPES = new Set([
  ActivityTypes.CREATE_CARD,
  ActivityTypes.MOVE_CARD,
  ActivityTypes.ADD_MEMBER_TO_CARD,
  ActivityTypes.COMPLETE_TASK,
  ActivityTypes.CREATE_TASK,
  ActivityTypes.CREATE_TASK_LIST,
  ActivityTypes.CREATE_ATTACHMENT,
  ActivityTypes.COMMENT_CREATE,
  ActivityTypes.COMMENT_REPLY,
  ActivityTypes.ADD_LABEL_TO_CARD,
]);

const WARNING_TYPES = new Set([ActivityTypes.UNCOMPLETE_TASK, ActivityTypes.SET_DUE_DATE]);

const DANGER_TYPES = new Set([
  ActivityTypes.REMOVE_MEMBER_FROM_CARD,
  ActivityTypes.DELETE_TASK,
  ActivityTypes.DELETE_TASK_LIST,
  ActivityTypes.DELETE_ATTACHMENT,
  ActivityTypes.COMMENT_DELETE,
  ActivityTypes.REMOVE_LABEL_FROM_CARD,
]);

const Item = React.memo(({ id }) => {
  const selectActivityById = useMemo(() => selectors.makeSelectActivityById(), []);
  const selectUserById = useMemo(() => selectors.makeSelectUserById(), []);

  const activity = useSelector((state) => selectActivityById(state, id));
  const user = useSelector((state) => selectUserById(state, activity.userId));
  const currentCard = useSelector(selectors.selectCurrentCard);

  const [t, i18n] = useTranslation();

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
    case ActivityTypes.CREATE_TASK:
    case ActivityTypes.DELETE_TASK:
    case ActivityTypes.UPDATE_TASK: {
      const taskName = activity.data?.task?.name || t('common.unknownTask');
      const translationKeyByType = {
        [ActivityTypes.CREATE_TASK]: 'common.userCreatedTaskOnThisCard',
        [ActivityTypes.DELETE_TASK]: 'common.userDeletedTaskOnThisCard',
        [ActivityTypes.UPDATE_TASK]: 'common.userUpdatedTaskOnThisCard',
      };

      contentNode = (
        <Trans
          i18nKey={translationKeyByType[activity.type]}
          values={{
            user: userName,
            task: taskName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' changed task '}
          <strong className={styles.subject}>{taskName}</strong>
        </Trans>
      );

      break;
    }
    case ActivityTypes.CREATE_TASK_LIST:
    case ActivityTypes.DELETE_TASK_LIST: {
      const taskListName = activity.data?.taskList?.name || t('common.unknownTaskList');
      const translationKey =
        activity.type === ActivityTypes.CREATE_TASK_LIST
          ? 'common.userCreatedTaskListOnThisCard'
          : 'common.userDeletedTaskListOnThisCard';

      contentNode = (
        <Trans
          i18nKey={translationKey}
          values={{
            user: userName,
            taskList: taskListName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' changed task list '}
          <strong className={styles.subject}>{taskListName}</strong>
        </Trans>
      );

      break;
    }
    case ActivityTypes.CREATE_ATTACHMENT:
    case ActivityTypes.DELETE_ATTACHMENT: {
      const attachmentName = activity.data?.attachmentName || t('common.unknownAttachment');
      const isVideo = activity.data?.isVideo === true;
      let translationKey;

      if (activity.type === ActivityTypes.CREATE_ATTACHMENT) {
        translationKey = isVideo
          ? 'common.userCreatedVideoOnThisCard'
          : 'common.userCreatedAttachmentOnThisCard';
      } else {
        translationKey = isVideo
          ? 'common.userDeletedVideoOnThisCard'
          : 'common.userDeletedAttachmentOnThisCard';
      }

      contentNode = (
        <Trans
          i18nKey={translationKey}
          values={{
            user: userName,
            attachment: attachmentName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' changed attachment '}
          <strong className={styles.subject}>{attachmentName}</strong>
        </Trans>
      );

      break;
    }
    case ActivityTypes.ADD_LABEL_TO_CARD:
    case ActivityTypes.REMOVE_LABEL_FROM_CARD: {
      const labelName = activity.data?.labelName || t('common.unknownLabel');
      const cardName = currentCard?.name || t('common.thisCard');
      const translationKey =
        activity.type === ActivityTypes.ADD_LABEL_TO_CARD
          ? 'common.userAddedLabelToCard'
          : 'common.userRemovedLabelFromCard';

      contentNode = (
        <Trans
          i18nKey={translationKey}
          values={{
            user: userName,
            label: labelName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' changed label '}
          <strong className={styles.subject}>{labelName}</strong>
          {' on card '}
          <strong className={styles.subject}>{cardName}</strong>
        </Trans>
      );

      break;
    }
    case ActivityTypes.SET_DUE_DATE: {
      const formatDate = (date) =>
        date ? new Date(date).toLocaleDateString(i18n.resolvedLanguage || i18n.language) : null;
      const oldDate = formatDate(activity.data?.oldDueDate);
      const newDate = formatDate(activity.data?.newDueDate);
      const cardName = currentCard?.name || t('common.thisCard');

      if (oldDate && !newDate) {
        contentNode = (
          <Trans
            i18nKey="common.userRemovedDueDateFromCard"
            values={{
              user: userName,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' removed due date from '}
            <strong className={styles.subject}>{cardName}</strong>
          </Trans>
        );
      } else if (oldDate && newDate) {
        contentNode = (
          <Trans
            i18nKey="common.userChangedDueDateOfCard"
            values={{
              user: userName,
              oldDate,
              newDate,
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' changed due date from '}
            <strong className={styles.subject}>{oldDate}</strong>
            {' to '}
            <strong className={styles.subject}>{newDate}</strong>
            {' on '}
            <strong className={styles.subject}>{cardName}</strong>
          </Trans>
        );
      } else {
        contentNode = (
          <Trans
            i18nKey="common.userSetDueDateOnCard"
            values={{
              user: userName,
              date: newDate || t('common.unknownDate'),
              card: cardName,
            }}
          >
            <span className={styles.author}>{userName}</span>
            {' set due date '}
            <strong className={styles.subject}>{newDate || t('common.unknownDate')}</strong>
            {' on '}
            <strong className={styles.subject}>{cardName}</strong>
          </Trans>
        );
      }

      break;
    }
    case ActivityTypes.COMMENT_CREATE:
    case ActivityTypes.COMMENT_UPDATE:
    case ActivityTypes.COMMENT_DELETE:
    case ActivityTypes.COMMENT_REPLY: {
      // Extrair dados com verificações de segurança
      const {
        commentText,
        cardName: activityCardName,
        mentions,
        isReply,
        action,
      } = activity.data || {};

      // Usar traduções existentes
      let translationKey;
      switch (action) {
        case 'create':
          translationKey = isReply
            ? 'common.userRepliedToCommentOnCard'
            : 'common.userCommentedOnCard';
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
            card: activityCardName || t('common.thisCard'),
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' changed a comment on '}
          <strong className={styles.cardName}>{activityCardName || t('common.thisCard')}</strong>
        </Trans>
      );

      // Adicionar texto do comentário ao contentNode
      if (action !== 'delete' && commentText) {
        contentNode = (
          <>
            {contentNode}
            <div className={styles.commentText}>
              <div className={styles.commentContent}>{formatTextWithMentions(commentText)}</div>
              {mentions && mentions.length > 0 && (
                <div className={styles.mentions}>
                  {mentions.map((mention) => (
                    <span key={mention} className={styles.mention}>
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
              <em>{t('common.deletedComment')}</em>
            </div>
          </>
        );
      }

      break;
    }
    default: {
      const cardName = currentCard?.name || t('common.thisCard');

      contentNode = (
        <Trans
          i18nKey="common.activityLogMessage"
          values={{
            user: userName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{userName}</span>
          {' performed an action on '}
          <strong className={styles.subject}>{cardName}</strong>
        </Trans>
      );
    }
  }

  const markerClassName = classNames(styles.marker, {
    [styles.markerAccent]: ACCENT_TYPES.has(activity.type),
    [styles.markerWarning]: WARNING_TYPES.has(activity.type),
    [styles.markerDanger]: DANGER_TYPES.has(activity.type),
  });

  return (
    <li className={styles.item}>
      <span className={styles.rail} aria-hidden="true">
        <span className={markerClassName}>
          <Icon fitted name={IconByType[activity.type] || 'clock outline'} size="small" />
        </span>
        <span className={styles.connector} />
      </span>
      <article className={styles.content}>
        <div className={styles.body}>{contentNode}</div>
        <span className={styles.date}>
          <TimeAgo date={activity.createdAt} />
        </span>
      </article>
    </li>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
};

export default Item;
