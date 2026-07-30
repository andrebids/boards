export const resolveDetectedLanguage = (languageDetector, languageUtils, fallbackLanguage) =>
  languageUtils.getBestMatchFromCodes(languageDetector.detect()) || fallbackLanguage;

export default {
  resolveDetectedLanguage,
};
