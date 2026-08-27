/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const MIN_3D_EXPOSURE = 0.35;
export const MAX_3D_EXPOSURE = 1.25;
export const DEFAULT_3D_EXPOSURE = 0.65;
export const THREE_D_EXPOSURE_STEP = 0.05;

export const THREE_D_POINTER_HANDLERS = {
  onPointerDown: (event) => event.stopPropagation(),
};
