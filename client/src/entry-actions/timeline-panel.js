/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import ActionTypes from '../constants/ActionTypes';

const toggleTimelinePanel = () => ({
  type: ActionTypes.TIMELINE_PANEL_TOGGLE,
});

const setTimelinePanelExpanded = isExpanded => ({
  type: ActionTypes.TIMELINE_PANEL_SET_EXPANDED,
  payload: {
    isExpanded,
  },
});

export default {
  toggleTimelinePanel,
  setTimelinePanelExpanded,
};
