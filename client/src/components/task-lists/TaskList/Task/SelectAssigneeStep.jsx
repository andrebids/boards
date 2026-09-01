/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';

import BoardMembershipsStep from '../../../board-memberships/BoardMembershipsStep';

const SelectAssigneeStep = React.memo(
  ({ currentUserIds, onUserSelect, onUserDeselect, onClear, onBack }) => (
    <BoardMembershipsStep
      currentUserIds={currentUserIds}
      title="common.selectAssignee"
      clearButtonContent="action.removeAssignee"
      onUserSelect={onUserSelect}
      onUserDeselect={onUserDeselect}
      onClear={onClear}
      onBack={onBack}
    />
  ),
);

SelectAssigneeStep.propTypes = {
  currentUserIds: PropTypes.arrayOf(PropTypes.string),
  onUserSelect: PropTypes.func.isRequired,
  onUserDeselect: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onBack: PropTypes.func,
};

SelectAssigneeStep.defaultProps = {
  currentUserIds: [],
  onBack: undefined,
};

export default SelectAssigneeStep;
