/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { attr, fk, oneToOne } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'Notification';

  static fields = {
    id: attr(),
    type: attr(),
    data: attr(),
    isRead: attr(),
    userId: fk({
      to: 'User',
      as: 'user',
      relatedName: 'notifications',
    }),
    creatorUserId: fk({
      to: 'User',
      as: 'creatorUser',
      relatedName: 'createdNotifications',
    }),
    boardId: fk({
      to: 'Board',
      as: 'board',
      relatedName: 'notifications',
    }),
    cardId: fk({
      to: 'Card',
      as: 'card',
      relatedName: 'notifications',
    }),
    commentId: oneToOne({
      to: 'Comment',
      as: 'comment',
    }),
    activityId: oneToOne({
      to: 'Activity',
      as: 'activity',
    }),
  };

  static reducer({ type, payload }, Notification) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.USER_UPDATE_HANDLE:
      case ActionTypes.PROJECT_UPDATE_HANDLE:
      case ActionTypes.PROJECT_MANAGER_CREATE_HANDLE:
      case ActionTypes.BOARD_MEMBERSHIP_CREATE_HANDLE:
        if (payload.notificationsToDelete) {
          payload.notificationsToDelete.forEach((notification) => {
            Notification.withId(notification.id).delete();
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        Notification.filter({
          isRead: false,
        })
          .toModelArray()
          .forEach((notificationModel) => {
            notificationModel.delete();
          });

        payload.notifications.forEach((notification) => {
          Notification.upsert(notification);
        });

        break;
      case ActionTypes.CORE_INITIALIZE:
        payload.notifications.forEach((notification) => {
          Notification.upsert(notification);
        });

        break;
      case ActionTypes.ALL_NOTIFICATIONS_DELETE:
        Notification.filter({
          isRead: false,
        })
          .toModelArray()
          .forEach((notificationModel) => {
            notificationModel.update({
              isRead: true,
            });
          });

        break;
      case ActionTypes.ALL_NOTIFICATIONS_DELETE__SUCCESS:
        payload.notifications.forEach((notification) => {
          const notificationModel = Notification.withId(notification.id);

          if (notificationModel) {
            notificationModel.update(notification);
          }
        });

        break;
      case ActionTypes.NOTIFICATION_CREATE_HANDLE:
        Notification.upsert(payload.notification);

        break;
      case ActionTypes.NOTIFICATION_HISTORY_FETCH__SUCCESS:
        payload.notifications.forEach((notification) => {
          Notification.upsert(notification);
        });

        break;
      case ActionTypes.NOTIFICATION_DELETE: {
        const notificationModel = Notification.withId(payload.id);

        if (notificationModel) {
          notificationModel.update({
            isRead: true,
          });
        }

        break;
      }
      case ActionTypes.NOTIFICATION_DELETE__FAILURE: {
        const notificationModel = Notification.withId(payload.id);

        if (notificationModel) {
          notificationModel.update({
            isRead: false,
          });
        }

        break;
      }
      case ActionTypes.NOTIFICATION_DELETE__SUCCESS:
      case ActionTypes.NOTIFICATION_DELETE_HANDLE: {
        const notificationModel = Notification.withId(payload.notification.id);

        if (notificationModel) {
          notificationModel.update(payload.notification);
        }

        break;
      }
      default:
    }
  }
}
