/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { PresenceStatuses } from '../constants/Enums';

// 3 minutos, o mesmo limiar que o PLANKA Pro usa.
export const IDLE_AFTER_MILLISECONDS = 3 * 60 * 1000;

const ACTIVITY_EVENT_TYPES = [
  'mousemove',
  'mousedown',
  'keydown',
  'wheel',
  'scroll',
  'touchstart',
];

// O separador escondido conta como ausente de imediato; caso contrário espera-se
// pelo temporizador de inatividade.
const createPresenceTracker = ({
  onChange,
  idleAfter = IDLE_AFTER_MILLISECONDS,
  documentRef = typeof document === 'undefined' ? null : document,
  windowRef = typeof window === 'undefined' ? null : window,
} = {}) => {
  let status = null;
  let timeout = null;

  const apply = nextStatus => {
    if (nextStatus === status) {
      return;
    }

    status = nextStatus;
    onChange(status);
  };

  const isHidden = () =>
    !!documentRef && documentRef.visibilityState === 'hidden';

  const goIdle = () => {
    apply(PresenceStatuses.IDLE);
  };

  const restartTimer = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (isHidden()) {
      return;
    }

    timeout = setTimeout(goIdle, idleAfter);
  };

  const handleActivity = () => {
    if (isHidden()) {
      return;
    }

    apply(PresenceStatuses.ONLINE);
    restartTimer();
  };

  const handleVisibilityChange = () => {
    if (isHidden()) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      goIdle();
      return;
    }

    handleActivity();
  };

  const start = () => {
    if (documentRef) {
      documentRef.addEventListener('visibilitychange', handleVisibilityChange);

      ACTIVITY_EVENT_TYPES.forEach(eventType => {
        documentRef.addEventListener(eventType, handleActivity, {
          passive: true,
        });
      });
    }

    if (windowRef) {
      windowRef.addEventListener('focus', handleActivity);
    }

    apply(isHidden() ? PresenceStatuses.IDLE : PresenceStatuses.ONLINE);
    restartTimer();
  };

  const stop = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (documentRef) {
      documentRef.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      ACTIVITY_EVENT_TYPES.forEach(eventType => {
        documentRef.removeEventListener(eventType, handleActivity);
      });
    }

    if (windowRef) {
      windowRef.removeEventListener('focus', handleActivity);
    }

    status = null;
  };

  return { start, stop };
};

export default createPresenceTracker;
