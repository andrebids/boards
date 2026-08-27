/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import api from '../api';
import selectors from '../selectors';
import {
  WebPushStates,
  activateWebPush,
  disableWebPush,
  getWebPushErrorState,
  reconcileWebPush,
} from '../utils/web-push';

const useWebPush = () => {
  const config = useSelector(selectors.selectConfig);
  const [state, setState] = useState(WebPushStates.ACTIVATING);

  const webPushConfig = config.webPush || {};
  const syncSubscription = useCallback(
    (subscription) => api.createWebPushSubscription(subscription),
    [],
  );
  const removeSubscription = useCallback(
    (endpoint) => api.deleteCurrentWebPushSubscription(endpoint),
    [],
  );

  useEffect(() => {
    let isCurrent = true;

    if (!webPushConfig.enabled) {
      setState(WebPushStates.UNSUPPORTED);
      return undefined;
    }

    setState(WebPushStates.ACTIVATING);
    reconcileWebPush({
      enabled: webPushConfig.enabled,
      publicKey: webPushConfig.publicKey,
      syncSubscription,
    })
      .then((nextState) => {
        if (isCurrent) {
          setState(nextState);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setState(getWebPushErrorState(error));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [syncSubscription, webPushConfig.enabled, webPushConfig.publicKey]);

  const activate = useCallback(
    () =>
      activateWebPush({
        publicKey: webPushConfig.publicKey,
        syncSubscription,
      }),
    [syncSubscription, webPushConfig.publicKey],
  );

  const disable = useCallback(
    () =>
      disableWebPush({
        removeSubscription,
      }),
    [removeSubscription],
  );

  return {
    activate,
    disable,
    isEnabled: Boolean(webPushConfig.enabled),
    setState,
    state,
  };
};

export default useWebPush;
