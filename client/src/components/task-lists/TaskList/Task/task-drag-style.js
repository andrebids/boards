/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const TASK_INDENT_SIZE = 24;
const MAX_TASK_INDENT = 120;
const DEPTH_TRANSITION =
  'margin-left 140ms cubic-bezier(0.2, 0, 0, 1), width 140ms cubic-bezier(0.2, 0, 0, 1)';

const getTaskIndent = (depth) => Math.min(depth * TASK_INDENT_SIZE, MAX_TASK_INDENT);

export const getTaskVisualDepth = (
  taskId,
  depth,
  previewDepth,
  taskDragPreview,
  isDropAnimating,
) => {
  if (taskDragPreview?.taskId === taskId && !taskDragPreview.isCancelled) {
    return taskDragPreview.depth;
  }

  if (isDropAnimating && !taskDragPreview?.isCancelled) {
    return previewDepth;
  }

  return depth;
};

const buildTaskDragStyle = (style, sourceDepth, previewDepth) => ({
  ...style,
  opacity: 1,
  transform: style.transform?.replace(/\s+scale\([^)]*\)$/, ''),
  transition: [style.transition, DEPTH_TRANSITION].filter(Boolean).join(', '),
  width:
    typeof style.width === 'number'
      ? style.width - getTaskIndent(previewDepth) + getTaskIndent(sourceDepth)
      : style.width,
  '--task-depth': previewDepth,
});

export default buildTaskDragStyle;
