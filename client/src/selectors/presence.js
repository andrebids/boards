/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { PresenceStatuses } from '../constants/Enums';

export const selectPresenceStatusByUserId = state =>
  state.presence.statusByUserId;

export const selectPresenceStatusForUserId = (state, userId) =>
  state.presence.statusByUserId[userId];

export const selectIsUserOnline = (state, userId) =>
  state.presence.statusByUserId[userId] === PresenceStatuses.ONLINE;

export default {
  selectPresenceStatusByUserId,
  selectPresenceStatusForUserId,
  selectIsUserOnline,
};
