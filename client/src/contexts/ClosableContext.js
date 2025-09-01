/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { createContext } from 'react';

// Valores padrão do contexto com funções no-op para evitar erros
const defaultContextValue = [
  () => {}, // activateClosable - função no-op
  () => {}, // deactivateClosable - função no-op
  () => {}  // setIsClosableActive - função no-op
];

export default createContext(defaultContextValue);
