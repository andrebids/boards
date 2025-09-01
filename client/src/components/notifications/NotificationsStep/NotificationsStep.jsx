/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Item from './Item';

import styles from './NotificationsStep.module.scss';

const NotificationsStep = React.memo(({ onClose }) => {
  const notificationIds = useSelector(
    selectors.selectNotificationIdsForCurrentUser
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleDeleteAllClick = useCallback(() => {
    dispatch(entryActions.deleteAllNotifications());
  }, [dispatch]);

  return (
    <>
      <Popup.Content>
        <div className={styles.container}>
          <div className={styles.headerRow}>
            <div className={styles.title}>
              {t('common.notifications', {
                context: 'title',
              })}
            </div>
            {notificationIds.length > 1 && (
              <button
                type="button"
                className={styles.headerAction}
                onClick={handleDeleteAllClick}
              >
                {t('action.dismissAll')}
              </button>
            )}
          </div>
          {notificationIds.length > 0 ? (
            <>
              <div className={styles.items}>
                {notificationIds.map(notificationId => (
                  <Item
                    key={notificationId}
                    id={notificationId}
                    onClose={onClose}
                  />
                ))}
              </div>
            </>
          ) : (
            t('common.noUnreadNotifications')
          )}
        </div>
      </Popup.Content>
    </>
  );
});

NotificationsStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default NotificationsStep;
