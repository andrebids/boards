/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import {
  DEFAULT_3D_EXPOSURE,
  MAX_3D_EXPOSURE,
  MIN_3D_EXPOSURE,
  THREE_D_POINTER_HANDLERS,
} from './threeDViewerSettings';

describe('3D viewer settings', () => {
  it('blocks carousel drag only when a 3D gesture starts', () => {
    const event = { stopPropagation: jest.fn() };

    THREE_D_POINTER_HANDLERS.onPointerDown(event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(THREE_D_POINTER_HANDLERS).not.toHaveProperty('onPointerUp');
    expect(THREE_D_POINTER_HANDLERS).not.toHaveProperty('onPointerCancel');
  });

  it('starts darker than neutral while retaining an adjustable range', () => {
    expect(DEFAULT_3D_EXPOSURE).toBeLessThan(1);
    expect(MIN_3D_EXPOSURE).toBeLessThan(DEFAULT_3D_EXPOSURE);
    expect(MAX_3D_EXPOSURE).toBeGreaterThan(1);
  });
});
