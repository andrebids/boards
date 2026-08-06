/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { Loader } from 'semantic-ui-react';
import { useLocation } from 'react-router-dom';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';
import Content from './Content';
import PasswordResetRequest from './PasswordResetRequest';
import PasswordReset from './PasswordReset';

const Login = React.memo(() => {
  const isInitializing = useSelector(selectors.selectIsInitializing);
  const { pathname } = useLocation();

  if (isInitializing) {
    return <Loader active size="massive" />;
  }

  if (pathname === Paths.FORGOT_PASSWORD) {
    return <PasswordResetRequest />;
  }

  if (pathname === Paths.RESET_PASSWORD) {
    return <PasswordReset />;
  }

  return <Content />;
});

export default Login;
