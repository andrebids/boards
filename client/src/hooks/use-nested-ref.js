/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { useCallback, useRef } from 'react';

export const resolveNestedRef = (element, nestedRefName) =>
  element?.[nestedRefName]?.current || element || null;

export default (nestedRefName = 'ref') => {
  const ref = useRef(null);

  const handleRef = useCallback(
    element => {
      ref.current = resolveNestedRef(element, nestedRefName);
    },
    [nestedRefName]
  );

  return [ref, handleRef];
};
