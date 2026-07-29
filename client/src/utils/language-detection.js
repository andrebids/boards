export const resolveDetectedLanguage = (
  detectedLanguages,
  languageUtils,
  fallbackLanguage,
) => languageUtils.getBestMatchFromCodes(detectedLanguages) || fallbackLanguage;

export default {
  resolveDetectedLanguage,
};
