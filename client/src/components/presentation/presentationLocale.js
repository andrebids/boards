const SUPPORTED_PRIMARY_LANGUAGES = new Set([
  'ar',
  'az',
  'be',
  'bg',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'eu',
  'fi',
  'fr',
  'gl',
  'he',
  'hr',
  'hu',
  'hy',
  'id',
  'it',
  'ja',
  'ko',
  'lo',
  'lv',
  'ms',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'ru',
  'si',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
]);

const LANGUAGE_ALIASES = {
  'pt-BR': 'pt',
  'pt-PT': 'pt-PT',
  'sr-Cyrl-RS': 'sr-Cyrl',
  'sr-Latn-RS': 'sr',
  'zh-CN': 'zh',
  'zh-TW': 'zh-TW',
};

const getPresentationEditorLanguage = (applicationLanguage) => {
  if (LANGUAGE_ALIASES[applicationLanguage]) {
    return LANGUAGE_ALIASES[applicationLanguage];
  }

  const primaryLanguage = applicationLanguage?.split('-')[0];

  return SUPPORTED_PRIMARY_LANGUAGES.has(primaryLanguage) ? primaryLanguage : 'en';
};

export default getPresentationEditorLanguage;
