/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

// Importar e inicializar Sentry primeiro
import './sentry';

import React from 'react';
import ReactDOM from 'react-dom/client';

// Global tokens and framework-level overrides load before component styles.
import './styles/glass-theme.css';
import './styles/glass-modal.css';
import './styles/select-order-overrides.css';

import store from './store';
import history from './history';
import Root from './components/common/Root';

import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(Root, { store, history }));
