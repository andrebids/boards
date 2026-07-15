import merge from 'lodash/merge';

import login from './login';
import chat from './chat';
import core from './core';

export default {
  language: 'es-ES',
  country: 'es',
  name: 'Español',
  embeddedLocale: merge(login, chat, core),
};
