/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import api from '../../../api';
import { UserNotificationLevels } from '../../../constants/Enums';
import { Button } from '../../../lib/custom-ui';
import {
  WebPushStates,
  activateWebPush,
  disableWebPush,
  getWebPushErrorState,
  reconcileWebPush,
  showWebPushTestNotification,
} from '../../../utils/web-push';
import NotificationServices from '../../notification-services/NotificationServices';

import styles from './NotificationsPane.module.scss';

const NotificationsPane = React.memo(() => {
  const user = useSelector(selectors.selectCurrentUser);
  const config = useSelector(selectors.selectConfig);
  const notificationServiceIds = useSelector(selectors.selectNotificationServiceIdsForCurrentUser);
  const [webPushState, setWebPushState] = useState(WebPushStates.ACTIVATING);
  const [webPushTestUnavailable, setWebPushTestUnavailable] = useState(false);

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

  const webPushConfig = config.webPush || {};
  const syncWebPushSubscription = useCallback(
    (subscription) => api.createWebPushSubscription(subscription),
    [],
  );
  const removeWebPushSubscription = useCallback(
    (endpoint) => api.deleteCurrentWebPushSubscription(endpoint),
    [],
  );

  useEffect(() => {
    let isCurrent = true;

    if (!webPushConfig.enabled) {
      setWebPushState(WebPushStates.UNSUPPORTED);
      return undefined;
    }

    setWebPushState(WebPushStates.ACTIVATING);
    reconcileWebPush({
      enabled: webPushConfig.enabled,
      publicKey: webPushConfig.publicKey,
      syncSubscription: syncWebPushSubscription,
    })
      .then((state) => {
        if (isCurrent) {
          setWebPushState(state);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setWebPushState(getWebPushErrorState(error));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [syncWebPushSubscription, webPushConfig.enabled, webPushConfig.publicKey]);

  const handleWebPushToggle = useCallback(async () => {
    setWebPushState(WebPushStates.ACTIVATING);

    try {
      const nextState =
        webPushState === WebPushStates.ACTIVE
          ? await disableWebPush({
              removeSubscription: removeWebPushSubscription,
            })
          : await activateWebPush({
              publicKey: webPushConfig.publicKey,
              syncSubscription: syncWebPushSubscription,
            });
      setWebPushState(nextState);
    } catch (error) {
      setWebPushState(getWebPushErrorState(error));
    }
  }, [removeWebPushSubscription, syncWebPushSubscription, webPushConfig.publicKey, webPushState]);

  const handleWebPushTest = useCallback(async () => {
    try {
      const wasShown = await showWebPushTestNotification();
      setWebPushTestUnavailable(!wasShown);
    } catch (error) {
      setWebPushState(getWebPushErrorState(error));
    }
  }, []);

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

      {webPushConfig.enabled && (
        <section className={styles.deviceNotifications} aria-labelledby="web-push-title">
          <div className={styles.deviceNotificationsContent}>
            <h3 id="web-push-title" className={styles.sectionTitle}>
              {t('common.chatNotificationsOnThisDevice')}
            </h3>
            <p className={styles.sectionDescription}>
              {t('common.chatNotificationsOnThisDeviceDescription')}
            </p>
            <p className={styles.deviceStatus} role="status" aria-live="polite">
              <span
                className={
                  webPushState === WebPushStates.ACTIVE
                    ? `${styles.statusDot} ${styles.statusDotActive}`
                    : styles.statusDot
                }
                aria-hidden="true"
              />
              {t(`common.webPushState_${webPushState}`)}
            </p>
            {webPushState === WebPushStates.BLOCKED && (
              <p className={styles.help}>{t('common.webPushBlockedHelp')}</p>
            )}
            {webPushState === WebPushStates.ERROR && (
              <p className={styles.error} role="alert">
                {t('common.webPushErrorHelp')}
              </p>
            )}
            {webPushTestUnavailable && (
              <p className={styles.error} role="alert">
                {t('common.webPushTestUnavailable')}
              </p>
            )}
          </div>
          <div className={styles.deviceActions}>
            {webPushState === WebPushStates.ACTIVE && (
              <Button type="button" size="small" variant="secondary" onClick={handleWebPushTest}>
                {t('action.testChatNotifications')}
              </Button>
            )}
            <Button
              type="button"
              size="small"
              variant={webPushState === WebPushStates.ACTIVE ? 'secondary' : 'primary'}
              isPending={webPushState === WebPushStates.ACTIVATING}
              isDisabled={
                webPushState === WebPushStates.BLOCKED || webPushState === WebPushStates.UNSUPPORTED
              }
              onClick={handleWebPushToggle}
            >
              {webPushState === WebPushStates.ACTIVE
                ? t('action.turnOffChatNotifications')
                : t('action.turnOnChatNotifications')}
            </Button>
          </div>
        </section>
      )}

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
