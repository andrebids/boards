/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';

const ButtonGroupContext = React.createContext({
  fullWidth: false,
  isDisabled: undefined,
  size: undefined,
  variant: undefined,
});

export default ButtonGroupContext;
