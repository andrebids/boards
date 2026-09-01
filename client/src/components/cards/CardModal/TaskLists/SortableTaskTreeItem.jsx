/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { closePopup } from '../../../../lib/popup';

import Item from './Item';
import TaskListFooter from './TaskListFooter';
import Task from '../../../task-lists/TaskList/Task';

import styles from './SortableTaskTree.module.scss';

const SortableTaskTreeItem = React.forwardRef(
  (
    {
      item,
      depth,
      ghost,
      clone,
      isOver,
      isOverParent,
      handleProps,
      onCollapse,
      wrapperRef,
      style,
      recentlyDroppedId,
      onKeyboardMove,
      onTaskListKeyboardMove,
    },
    ref,
  ) => {
    const isRecentlyDropped = recentlyDroppedId === item.id;
    const dragHandleProps = handleProps
      ? {
          ...handleProps,
          onPointerDown: (event) => {
            closePopup();
            handleProps.onPointerDown?.(event);
          },
        }
      : undefined;

    if (item.kind === 'taskList') {
      return (
        <li
          ref={wrapperRef}
          role="treeitem"
          aria-level={1}
          aria-selected={false}
          aria-expanded
          style={style}
          className={classNames(
            clone && 'card-modal-theme',
            styles.node,
            styles.taskListNode,
            ghost && styles.ghost,
            (isOver || isOverParent) && styles.parentTarget,
            isRecentlyDropped && styles.recentlyDropped,
          )}
        >
          <Item
            ref={ref}
            id={item.recordId}
            handleProps={dragHandleProps}
            isDragging={Boolean(clone)}
            onKeyboardMove={onTaskListKeyboardMove}
          />
        </li>
      );
    }

    if (item.kind === 'footer') {
      return (
        <li
          ref={wrapperRef}
          role="none"
          style={style}
          className={classNames(styles.node, styles.footerNode)}
        >
          <div ref={ref}>
            <TaskListFooter taskListId={item.recordId} />
          </div>
        </li>
      );
    }

    return (
      <li
        ref={wrapperRef}
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={false}
        style={style}
        className={classNames(
          clone && 'card-modal-theme',
          styles.node,
          styles.taskNode,
          ghost && styles.ghost,
          clone && styles.clone,
        )}
      >
        <Task
          ref={ref}
          id={item.recordId}
          depth={Math.max(0, depth - 1)}
          isCollapsed={Boolean(item.collapsed)}
          onCollapseToggle={onCollapse}
          dragHandleProps={dragHandleProps}
          isDragging={Boolean(clone)}
          isDropTarget={isOver}
          wasRecentlyDropped={isRecentlyDropped}
          onKeyboardMove={onKeyboardMove}
        />
      </li>
    );
  },
);

SortableTaskTreeItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    kind: PropTypes.oneOf(['taskList', 'task', 'footer']).isRequired,
    recordId: PropTypes.string.isRequired,
    collapsed: PropTypes.bool,
  }).isRequired,
  depth: PropTypes.number.isRequired,
  ghost: PropTypes.bool,
  clone: PropTypes.bool,
  isOver: PropTypes.bool.isRequired,
  isOverParent: PropTypes.bool.isRequired,
  handleProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onCollapse: PropTypes.func,
  wrapperRef: PropTypes.func,
  style: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  recentlyDroppedId: PropTypes.string,
  onKeyboardMove: PropTypes.func.isRequired,
  onTaskListKeyboardMove: PropTypes.func.isRequired,
};

SortableTaskTreeItem.defaultProps = {
  ghost: false,
  clone: false,
  handleProps: undefined,
  onCollapse: undefined,
  wrapperRef: undefined,
  style: undefined,
  recentlyDroppedId: null,
};

export default SortableTaskTreeItem;
