import merge from 'lodash/merge';

import login from './login';
import core from './core';
import finance from './finance';

export default {
  language: 'pt-BR',
  country: 'br',
  name: 'Português',
  embeddedLocale: merge(login, core, finance),
};
