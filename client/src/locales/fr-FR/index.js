import merge from 'lodash/merge';

import login from './login';
import core from './core';
import finance from './finance';

export default {
  language: 'fr-FR',
  country: 'fr',
  name: 'Français',
  embeddedLocale: merge(login, core, finance),
};
