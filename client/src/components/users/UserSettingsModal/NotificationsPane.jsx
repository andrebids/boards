/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { UserNotificationLevels } from '../../../constants/Enums';
import NotificationServices from '../../notification-services/NotificationServices';

import styles from './NotificationsPane.module.scss';

const NotificationsPane = React.memo(() => {
  const user = useSelector(selectors.selectCurrentUser);
  const notificationServiceIds = useSelector(selectors.selectNotificationServiceIdsForCurrentUser);

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleCreate = useCallback(
    (data) => {
      dispatch(entryActions.createNotificationServiceInCurrentUser(data));
    },
    [dispatch],
  );

  const handleNotificationLevelChange = useCallback(
    ({ target: { value } }) => {
      dispatch(
        entryActions.updateCurrentUser({
          notificationLevel: value,
        }),
      );
    },
    [dispatch],
  );

  const updateForm = user.notificationLevelUpdateForm || {};
  const isUpdating = Boolean(updateForm.isSubmitting);

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <fieldset
        className={styles.preferenceGroup}
        aria-describedby="notification-level-description"
        aria-busy={isUpdating}
        disabled={isUpdating}
      >
        <legend className={styles.sectionTitle}>{t('common.personalNotifications')}</legend>
        <p id="notification-level-description" className={styles.sectionDescription}>
          {t('common.personalNotificationsDescription')}
        </p>

        <label
          htmlFor="notification-level-all"
          className={
            user.notificationLevel === UserNotificationLevels.ALL
              ? `${styles.option} ${styles.optionSelected}`
              : styles.option
          }
        >
          <input
            id="notification-level-all"
            type="radio"
            name="notificationLevel"
            value={UserNotificationLevels.ALL}
            checked={user.notificationLevel === UserNotificationLevels.ALL}
            onChange={handleNotificationLevelChange}
          />
          <span className={styles.optionContent}>
            <strong>{t('common.allNotifications')}</strong>
            <span>{t('common.allNotificationsDescription')}</span>
          </span>
        </label>

        <label
          htmlFor="notification-level-essential"
          className={
            user.notificationLevel === UserNotificationLevels.ESSENTIAL
              ? `${styles.option} ${styles.optionSelected}`
              : styles.option
          }
        >
          <input
            id="notification-level-essential"
            type="radio"
            name="notificationLevel"
            value={UserNotificationLevels.ESSENTIAL}
            checked={user.notificationLevel === UserNotificationLevels.ESSENTIAL}
            onChange={handleNotificationLevelChange}
          />
          <span className={styles.optionContent}>
            <strong>{t('common.essentialNotificationsOnly')}</strong>
            <span>{t('common.essentialNotificationsDescription')}</span>
          </span>
        </label>

        <label
          htmlFor="notification-level-none"
          className={
            user.notificationLevel === UserNotificationLevels.NONE
              ? `${styles.option} ${styles.optionSelected}`
              : styles.option
          }
        >
          <input
            id="notification-level-none"
            type="radio"
            name="notificationLevel"
            value={UserNotificationLevels.NONE}
            checked={user.notificationLevel === UserNotificationLevels.NONE}
            onChange={handleNotificationLevelChange}
          />
          <span className={styles.optionContent}>
            <strong>{t('common.noNotifications')}</strong>
            <span>{t('common.noNotificationsDescription')}</span>
          </span>
        </label>

        {isUpdating && (
          <span className={styles.visuallyHidden} role="status">
            {t('common.savingNotificationPreference')}
          </span>
        )}

        {updateForm.error && (
          <p className={styles.error} role="alert">
            {t('common.notificationPreferenceSaveFailed')}
          </p>
        )}
      </fieldset>

      <section className={styles.services} aria-labelledby="notification-services-title">
        <h3 id="notification-services-title" className={styles.sectionTitle}>
          {t('common.notificationDelivery')}
        </h3>
        <p className={styles.sectionDescription}>{t('common.notificationDeliveryDescription')}</p>
        <NotificationServices ids={notificationServiceIds} onCreate={handleCreate} />
      </section>
    </Tab.Pane>
  );
});

export default NotificationsPane;
