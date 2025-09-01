/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const toggleSidebar = () => ({
  type: ActionTypes.SIDEBAR_TOGGLE,
});

const setSidebarExpanded = isExpanded => ({
  type: ActionTypes.SIDEBAR_EXPANDED_SET,
  payload: {
    isExpanded,
  },
});

export default {
  toggleSidebar,
  setSidebarExpanded,
};
