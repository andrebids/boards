/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { useCallback, useState } from 'react';

export default initialData => {
  const [data, setData] = useState(() =>
    typeof initialData === 'function' ? initialData() : initialData
  );

  const handleFieldChange = useCallback(
    (_, { type, name: fieldName, value, checked }) => {
      const nextValue =
        // semantic-ui-react Checkbox/Toggle envia `checked`
        typeof checked !== 'undefined'
          ? checked
          : // inputs number devolvem string, normalizar se possível
            type === 'number'
          ? value
          : value;

      setData(prevData => ({
        ...prevData,
        [fieldName]: nextValue,
      }));
    },
    []
  );

  return [data, handleFieldChange, setData];
};
