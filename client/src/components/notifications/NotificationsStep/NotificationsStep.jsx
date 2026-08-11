/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { Popup } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import Item from './Item';

import styles from './NotificationsStep.module.scss';

const NotificationsStep = React.memo(({ projectId, onClose }) => {
  const selectNotificationIdsByProjectId = useMemo(
    () => selectors.makeSelectNotificationIdsByProjectId(),
    [],
  );

  const notificationIds = useSelector((state) =>
    projectId
      ? selectNotificationIdsByProjectId(state, projectId)
      : selectors.selectNotificationIdsForCurrentUser(state),
  );

  const dispatch = useDispatch();
  const [t] = useTranslation();

  const handleDeleteAllClick = useCallback(() => {
    dispatch(entryActions.deleteAllNotifications());
  }, [dispatch]);

  return (
    <Popup.Content>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.title}>
            {projectId
              ? t('common.unreadProjectNotifications_title')
              : t('common.notifications', {
                  context: 'title',
                })}
          </div>
          {!projectId && notificationIds.length > 1 && (
            <button type="button" className={styles.headerAction} onClick={handleDeleteAllClick}>
              {t('action.dismissAll')}
            </button>
          )}
        </div>
        {notificationIds.length > 0 ? (
          <div className={styles.items}>
            {notificationIds.map((notificationId) => (
              <Item key={notificationId} id={notificationId} onClose={onClose} />
            ))}
          </div>
        ) : (
          t(projectId ? 'common.noUnreadProjectNotifications' : 'common.noUnreadNotifications')
        )}
      </div>
    </Popup.Content>
  );
});

NotificationsStep.propTypes = {
  projectId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

NotificationsStep.defaultProps = {
  projectId: undefined,
};

export default NotificationsStep;
