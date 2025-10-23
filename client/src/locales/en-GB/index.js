import merge from 'lodash/merge';

import login from './login';
import finance from './finance';

export default {
  language: 'en-GB',
  country: 'gb',
  name: 'English',
  embeddedLocale: merge(login, finance),
};
