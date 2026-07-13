import merge from 'lodash/merge';

import login from './login';
import core from './core';

export default {
  language: 'fr-FR',
  country: 'fr',
  name: 'Français',
  embeddedLocale: merge(login, core),
};
