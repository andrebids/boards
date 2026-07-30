import { resolveDetectedLanguage } from './language-detection';

describe('resolveDetectedLanguage', () => {
  it('uses the best supported language reported by the browser', () => {
    const languageDetector = {
      detect: jest.fn(() => ['fr-FR', 'en-US']),
    };
    const languageUtils = {
      getBestMatchFromCodes: jest.fn(() => 'fr-FR'),
    };

    const language = resolveDetectedLanguage(languageDetector, languageUtils, 'pt-PT');

    expect(languageDetector.detect).toHaveBeenCalledTimes(1);
    expect(languageUtils.getBestMatchFromCodes).toHaveBeenCalledWith(['fr-FR', 'en-US']);
    expect(language).toBe('fr-FR');
  });

  it('falls back to Portuguese when the browser reports no supported language', () => {
    const languageDetector = {
      detect: jest.fn(() => []),
    };
    const languageUtils = {
      getBestMatchFromCodes: jest.fn(() => undefined),
    };

    expect(resolveDetectedLanguage(languageDetector, languageUtils, 'pt-PT')).toBe('pt-PT');
  });
});
