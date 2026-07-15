import { useEffect, useReducer } from 'react';

import { getChatParticipantMuteExpiration, isChatParticipantMuted } from './utils';

const MAX_TIMEOUT_DELAY = 2 ** 31 - 1;
const EXPIRATION_PADDING = 25;

export const scheduleChatParticipantMuteExpiration = (expiration, onExpire, timing = {}) => {
  const getNow = timing.now || Date.now;
  const setTimer = timing.setTimeout || ((callback, delay) => window.setTimeout(callback, delay));
  const clearTimer = timing.clearTimeout || ((timeoutId) => window.clearTimeout(timeoutId));
  let timeoutId;

  const scheduleExpiration = () => {
    const remaining = expiration - getNow();

    if (remaining <= 0) {
      onExpire();
      return;
    }

    timeoutId = setTimer(
      scheduleExpiration,
      Math.min(remaining + EXPIRATION_PADDING, MAX_TIMEOUT_DELAY),
    );
  };

  scheduleExpiration();

  return () => {
    if (timeoutId !== undefined) {
      clearTimer(timeoutId);
    }
  };
};

const useChatParticipantMuteState = (participant) => {
  const [, refresh] = useReducer((version) => version + 1, 0);
  const expiration = getChatParticipantMuteExpiration(participant);

  useEffect(() => {
    if (expiration === null) {
      return undefined;
    }

    return scheduleChatParticipantMuteExpiration(expiration, refresh);
  }, [expiration]);

  return isChatParticipantMuted(participant);
};

export default useChatParticipantMuteState;
