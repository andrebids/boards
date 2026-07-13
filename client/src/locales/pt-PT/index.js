import merge from 'lodash/merge';

import login from './login';
import core from './core';

export default {
  language: 'pt-PT',
  country: 'pt',
  name: 'Português',
  embeddedLocale: merge(login, core),
};
