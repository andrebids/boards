/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const initialState = {
  statusByUserId: {},
};

// Indexado por utilizador, e não guardado no registo de utilizadores, para que
// alguém que apareça depois da última difusão (um membro acabado de adicionar)
// já traga o estado consigo.
// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case ActionTypes.USER_PRESENCE_UPDATE_HANDLE:
      return {
        ...state,
        statusByUserId: payload.presences.reduce(
          (result, { userId, status }) => ({
            ...result,
            [userId]: status,
          }),
          {}
        ),
      };
    case ActionTypes.SOCKET_RECONNECT_HANDLE:
      // Enquanto estivemos fora tudo pode ter mudado; o servidor volta a
      // difundir assim que nos anunciarmos.
      return initialState;
    default:
      return state;
  }
};
