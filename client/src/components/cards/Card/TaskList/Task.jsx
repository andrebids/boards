/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

import Linkify from '../../../common/Linkify';

import styles from './Task.module.scss';

const Task = React.memo(({ task, depth, childTasks, isCollapsed, onCollapseToggle }) => {
  const [t] = useTranslation();
  const hasChildren = childTasks.length > 0;
  const CollapseIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <li
      className={classNames(styles.wrapper, depth === 0 && styles.wrapperRoot)}
      style={{ '--task-preview-indent': `${Math.min(depth, 4) * 14}px` }}
    >
      {hasChildren && (
        <button
          type="button"
          className={styles.collapseButton}
          aria-expanded={!isCollapsed}
          aria-label={`${t(isCollapsed ? 'common.expandPanel' : 'common.collapsePanel')}: ${task.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onCollapseToggle(task.id);
          }}
        >
          <CollapseIcon size={12} aria-hidden="true" />
        </button>
      )}
      <span
        role="checkbox"
        aria-checked={task.isCompleted}
        aria-readonly="true"
        aria-label={task.name}
        className={classNames(styles.status, task.isCompleted && styles.statusCompleted)}
      >
        {task.isCompleted && <Check size={11} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className={classNames(styles.name, task.isCompleted && styles.nameCompleted)}>
        <Linkify linkStopPropagation>{task.name}</Linkify>
      </span>
      {hasChildren && (
        <span className={styles.count}>
          {childTasks.filter((childTask) => childTask.isCompleted).length}/{childTasks.length}
        </span>
      )}
    </li>
  );
});

Task.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    isCompleted: PropTypes.bool.isRequired,
  }).isRequired,
  depth: PropTypes.number.isRequired,
  childTasks: PropTypes.arrayOf(PropTypes.shape({ isCompleted: PropTypes.bool.isRequired }))
    .isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onCollapseToggle: PropTypes.func.isRequired,
};

export default Task;
