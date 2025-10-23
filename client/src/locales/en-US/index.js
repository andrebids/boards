import merge from 'lodash/merge';

import login from './login';
import core from './core';
import finance from './finance';

export default {
  language: 'en-US',
  country: 'us',
  name: 'English',
  embeddedLocale: merge(login, core, finance),
};
