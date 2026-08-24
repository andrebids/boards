/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import selectors from '../../../../selectors';
import Linkify from '../../../common/Linkify';

import styles from './Task.module.scss';

const Task = React.memo(({ id, isSubtask }) => {
  const selectTaskById = useMemo(() => selectors.makeSelectTaskById(), []);

  const task = useSelector((state) => selectTaskById(state, id));

  return (
    <li
      className={classNames(
        styles.wrapper,
        isSubtask && styles.wrapperSubtask,
        task.isCompleted && styles.wrapperCompleted,
      )}
    >
      <Linkify linkStopPropagation>{task.name}</Linkify>
    </li>
  );
});

Task.propTypes = {
  id: PropTypes.string.isRequired,
  isSubtask: PropTypes.bool.isRequired,
};

export default Task;
