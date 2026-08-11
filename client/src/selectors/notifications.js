/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createSelector } from 'redux-orm';

import orm from '../orm';
import { selectCurrentUserId } from './users';

export const makeSelectNotificationById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Notification }, id) => {
      const notificationModel = Notification.withId(id);

      if (!notificationModel) {
        return notificationModel;
      }

      return notificationModel.ref;
    },
  );

export const selectNotificationById = makeSelectNotificationById();

export const makeSelectNotificationIdsByCardId = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Notification }, id) =>
      Notification.filter({
        cardId: id,
      })
        .toRefArray()
        .map((notification) => notification.id),
  );

export const selectNotificationIdsByCardId = makeSelectNotificationIdsByCardId();

export const makeSelectNotificationIdsByProjectId = () =>
  createSelector(
    orm,
    (state) => selectCurrentUserId(state),
    (_, id) => id,
    ({ User, Board }, currentUserId, id) => {
      const currentUserModel = User.withId(currentUserId);

      if (!currentUserModel) {
        return [];
      }

      return currentUserModel
        .getUnreadNotificationsQuerySet()
        .toRefArray()
        .filter((notification) => {
          if (notification.projectId === id) {
            return true;
          }

          if (!notification.boardId) {
            return false;
          }

          const boardModel = Board.withId(notification.boardId);

          return boardModel && boardModel.projectId === id;
        })
        .map((notification) => notification.id);
    },
  );

export const selectNotificationIdsByProjectId = makeSelectNotificationIdsByProjectId();

export default {
  makeSelectNotificationById,
  selectNotificationById,
  makeSelectNotificationIdsByCardId,
  selectNotificationIdsByCardId,
  makeSelectNotificationIdsByProjectId,
  selectNotificationIdsByProjectId,
};
