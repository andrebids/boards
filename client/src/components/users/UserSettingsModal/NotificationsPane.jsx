/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Tab } from 'semantic-ui-react';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import { UserNotificationLevels } from '../../../constants/Enums';
import { useWebPush } from '../../../hooks';
import { Button } from '../../../lib/custom-ui';
import {
  WebPushStates,
  getWebPushErrorState,
  showWebPushTestNotification,
} from '../../../utils/web-push';

import styles from './NotificationsPane.module.scss';

const NotificationsPane = React.memo(() => {
  const user = useSelector(selectors.selectCurrentUser);
  const [webPushTestUnavailable, setWebPushTestUnavailable] = useState(false);
  const {
    activate: activateWebPush,
    disable: disableWebPush,
    isEnabled: isWebPushEnabled,
    setState: setWebPushState,
    state: webPushState,
  } = useWebPush();

  const dispatch = useDispatch();
  const [t] = useTranslation();

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

  const handleWebPushToggle = useCallback(async () => {
    setWebPushState(WebPushStates.ACTIVATING);

    try {
      const nextState =
        webPushState === WebPushStates.ACTIVE ? await disableWebPush() : await activateWebPush();
      setWebPushState(nextState);
    } catch (error) {
      setWebPushState(getWebPushErrorState(error));
    }
  }, [activateWebPush, disableWebPush, setWebPushState, webPushState]);

  const handleWebPushTest = useCallback(async () => {
    try {
      const wasShown = await showWebPushTestNotification(undefined, {
        body: t('common.chatNotificationsOnThisDeviceDescription'),
        title: `Boards · ${t('action.testChatNotifications')}`,
      });
      setWebPushTestUnavailable(!wasShown);
    } catch (error) {
      setWebPushState(getWebPushErrorState(error));
    }
  }, [setWebPushState, t]);

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

      {isWebPushEnabled && (
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
    </Tab.Pane>
  );
});

export default NotificationsPane;
