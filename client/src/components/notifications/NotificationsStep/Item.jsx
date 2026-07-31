/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import truncate from 'lodash/truncate';
import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { formatTextWithMentions } from '../../../utils/mentions';
import Paths from '../../../constants/Paths';
import { StaticUserIds } from '../../../constants/StaticUsers';
import { ActivityTypes, NotificationTypes } from '../../../constants/Enums';
import TimeAgo from '../../common/TimeAgo';
import UserAvatar from '../../users/UserAvatar';

import styles from './Item.module.scss';

const Item = React.memo(({ id, onClose }) => {
  const selectNotificationById = useMemo(() => selectors.makeSelectNotificationById(), []);
  const selectCreatorUserById = useMemo(() => selectors.makeSelectUserById(), []);
  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);

  const notification = useSelector((state) => selectNotificationById(state, id));

  const creatorUser = useSelector((state) =>
    selectCreatorUserById(state, notification.creatorUserId),
  );

  const card = useSelector((state) => selectCardById(state, notification.cardId));

  const dispatch = useDispatch();
  const [t, i18n] = useTranslation();

  const handleDeleteClick = useCallback(() => {
    dispatch(entryActions.deleteNotification(id));
  }, [id, dispatch]);

  const creatorUserName =
    creatorUser.id === StaticUserIds.DELETED
      ? t(`common.${creatorUser.name}`, {
          context: 'title',
        })
      : creatorUser.name;

  const cardName = card?.name || notification.data?.card?.name || 'Card';

  const renderDetailNotification = ({
    i18nKey,
    detail,
    beforeDetail,
    afterDetail,
    values = {},
  }) => (
    <Trans
      i18nKey={i18nKey}
      values={{
        user: creatorUserName,
        card: cardName,
        ...values,
      }}
    >
      <span className={styles.author}>{creatorUserName}</span>
      {beforeDetail}
      <strong>{detail}</strong>
      {afterDetail}
      <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
        {cardName}
      </Link>
    </Trans>
  );

  const formatDueDate = (value) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(i18n.language);
  };

  let contentNode;
  switch (notification.type) {
    case NotificationTypes.ADD_MEMBER_TO_BOARD: {
      const boardName =
        notification.data?.board?.name ||
        t('common.board', {
          defaultValue: 'Board',
        });

      contentNode = (
        <Trans
          i18nKey="common.userAddedYouToBoard"
          values={{
            user: creatorUserName,
            board: boardName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {' added you to board '}
          <Link to={Paths.BOARDS.replace(':id', notification.boardId)} onClick={onClose}>
            {boardName}
          </Link>
        </Trans>
      );

      break;
    }
    case NotificationTypes.MOVE_CARD: {
      const { fromList, toList } = notification.data || {};

      const fromListName = fromList?.name || t(`common.${fromList?.type || 'list'}`);
      const toListName = toList?.name || t(`common.${toList?.type || 'list'}`);

      contentNode = (
        <Trans
          i18nKey="common.userMovedCardFromListToList"
          values={{
            user: creatorUserName,
            card: cardName,
            fromList: fromListName,
            toList: toListName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {' moved '}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
          {' from '}
          {fromListName}
          {' to '}
          {toListName}
        </Trans>
      );

      break;
    }
    case NotificationTypes.COMMENT_CARD: {
      const commentText = truncate(formatTextWithMentions(notification.data.text || ''));

      contentNode = (
        <Trans
          i18nKey="common.userLeftNewCommentToCard"
          values={{
            user: creatorUserName,
            comment: commentText,
            card: cardName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {` left a new comment «${commentText}» to `}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case NotificationTypes.ADD_MEMBER_TO_CARD:
      contentNode = (
        <Trans
          i18nKey="common.userAddedYouToCard"
          values={{
            user: creatorUserName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {` added you to `}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    case NotificationTypes.MENTION_IN_COMMENT: {
      const commentText = truncate(formatTextWithMentions(notification.data.text || ''));

      contentNode = (
        <Trans
          i18nKey="common.userMentionedYouInCommentOnCard"
          values={{
            user: creatorUserName,
            comment: commentText,
            card: cardName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {` mentioned you in «${commentText}» on `}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
        </Trans>
      );

      break;
    }
    case ActivityTypes.CREATE_CARD: {
      const list = notification.data?.list;
      const listName = list?.name || t(`common.${list?.type || 'list'}`);

      contentNode = (
        <Trans
          i18nKey="common.userAddedCardToList"
          values={{
            user: creatorUserName,
            card: cardName,
            list: listName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {' added '}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
          {' to '}
          {listName}
        </Trans>
      );

      break;
    }
    case ActivityTypes.REMOVE_MEMBER_FROM_CARD: {
      const removedUserName =
        notification.data?.user?.name ||
        t('common.unknownUser', {
          defaultValue: 'Unknown user',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userRemovedUserFromCard',
        detail: removedUserName,
        beforeDetail: ' removed ',
        afterDetail: ' from ',
        values: {
          actorUser: creatorUserName,
          removedUser: removedUserName,
        },
      });

      break;
    }
    case ActivityTypes.CREATE_TASK: {
      const taskName =
        notification.data?.task?.name ||
        t('common.task', {
          defaultValue: 'task',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userCreatedTaskOnCard',
        detail: taskName,
        beforeDetail: ' created task ',
        afterDetail: ' on ',
        values: {
          task: taskName,
        },
      });

      break;
    }
    case ActivityTypes.DELETE_TASK: {
      const taskName =
        notification.data?.task?.name ||
        t('common.task', {
          defaultValue: 'task',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userDeletedTaskOnCard',
        detail: taskName,
        beforeDetail: ' deleted task ',
        afterDetail: ' from ',
        values: {
          task: taskName,
        },
      });

      break;
    }
    case ActivityTypes.UPDATE_TASK: {
      const taskName =
        notification.data?.task?.name ||
        t('common.task', {
          defaultValue: 'task',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userUpdatedTaskOnCard',
        detail: taskName,
        beforeDetail: ' updated task ',
        afterDetail: ' on ',
        values: {
          task: taskName,
        },
      });

      break;
    }
    case ActivityTypes.COMPLETE_TASK: {
      const taskName =
        notification.data?.task?.name ||
        t('common.task', {
          defaultValue: 'task',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userCompletedTaskOnCard',
        detail: taskName,
        beforeDetail: ' completed task ',
        afterDetail: ' on ',
        values: {
          task: taskName,
        },
      });

      break;
    }
    case ActivityTypes.UNCOMPLETE_TASK: {
      const taskName =
        notification.data?.task?.name ||
        t('common.task', {
          defaultValue: 'task',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userUncompletedTaskOnCard',
        detail: taskName,
        beforeDetail: ' marked task ',
        afterDetail: ' incomplete on ',
        values: {
          task: taskName,
        },
      });

      break;
    }
    case ActivityTypes.CREATE_TASK_LIST: {
      const taskListName =
        notification.data?.taskList?.name ||
        t('common.taskList', {
          defaultValue: 'task list',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userCreatedTaskListOnCard',
        detail: taskListName,
        beforeDetail: ' created task list ',
        afterDetail: ' on ',
        values: {
          taskList: taskListName,
        },
      });

      break;
    }
    case ActivityTypes.DELETE_TASK_LIST: {
      const taskListName =
        notification.data?.taskList?.name ||
        t('common.taskList', {
          defaultValue: 'task list',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userDeletedTaskListOnCard',
        detail: taskListName,
        beforeDetail: ' deleted task list ',
        afterDetail: ' from ',
        values: {
          taskList: taskListName,
        },
      });

      break;
    }
    case ActivityTypes.ADD_LABEL_TO_CARD: {
      const labelName =
        notification.data?.labelName ||
        t('common.label', {
          defaultValue: 'label',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userAddedLabelToCard',
        detail: labelName,
        beforeDetail: ' added label ',
        afterDetail: ' to ',
        values: {
          label: labelName,
        },
      });

      break;
    }
    case ActivityTypes.REMOVE_LABEL_FROM_CARD: {
      const labelName =
        notification.data?.labelName ||
        t('common.label', {
          defaultValue: 'label',
        });

      contentNode = renderDetailNotification({
        i18nKey: 'common.userRemovedLabelFromCard',
        detail: labelName,
        beforeDetail: ' removed label ',
        afterDetail: ' from ',
        values: {
          label: labelName,
        },
      });

      break;
    }
    case ActivityTypes.SET_DUE_DATE: {
      const oldDate = formatDueDate(notification.data?.oldDueDate);
      const newDate = formatDueDate(notification.data?.newDueDate);

      if (!oldDate && newDate) {
        contentNode = renderDetailNotification({
          i18nKey: 'common.userSetDueDateOnCard',
          detail: newDate,
          beforeDetail: ' set due date to ',
          afterDetail: ' for ',
          values: {
            date: newDate,
          },
        });
      } else if (oldDate && !newDate) {
        contentNode = (
          <Trans
            i18nKey="common.userRemovedDueDateFromCard"
            values={{
              user: creatorUserName,
              card: cardName,
            }}
          >
            <span className={styles.author}>{creatorUserName}</span>
            {' removed the due date from '}
            <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
              {cardName}
            </Link>
          </Trans>
        );
      } else {
        contentNode = (
          <Trans
            i18nKey="common.userChangedDueDateOfCard"
            values={{
              user: creatorUserName,
              oldDate,
              newDate,
              card: cardName,
            }}
          >
            <span className={styles.author}>{creatorUserName}</span>
            {' changed the due date from '}
            <strong>{oldDate}</strong>
            {' to '}
            <strong>{newDate}</strong>
            {' for '}
            <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
              {cardName}
            </Link>
          </Trans>
        );
      }

      break;
    }
    default:
      contentNode = (
        <Trans
          i18nKey="common.activityLogMessage"
          values={{
            user: creatorUserName,
            card: cardName,
          }}
        >
          <span className={styles.author}>{creatorUserName}</span>
          {' updated '}
          <Link to={Paths.CARDS.replace(':id', notification.cardId)} onClick={onClose}>
            {cardName}
          </Link>
        </Trans>
      );
  }

  return (
    <div className={styles.wrapper}>
      <UserAvatar id={notification.creatorUserId} size="large" />
      <span className={styles.content}>
        <div>{contentNode}</div>
        <span className={styles.date}>
          <TimeAgo date={notification.createdAt} />
        </span>
      </span>
      <Button
        variant="secondary"
        type="button"
        icon="trash alternate outline"
        aria-label={t('action.delete')}
        className={styles.button}
        onClick={handleDeleteClick}
      />
    </div>
  );
});

Item.propTypes = {
  id: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Item;
