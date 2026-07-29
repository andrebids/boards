import { resolveDetectedLanguage } from './language-detection';

describe('resolveDetectedLanguage', () => {
  it('uses the best supported language reported by the browser', () => {
    const languageUtils = {
      getBestMatchFromCodes: jest.fn(() => 'fr-FR'),
    };

    const language = resolveDetectedLanguage(
      ['fr-FR', 'en-US'],
      languageUtils,
      'pt-PT',
    );

    expect(languageUtils.getBestMatchFromCodes).toHaveBeenCalledWith([
      'fr-FR',
      'en-US',
    ]);
    expect(language).toBe('fr-FR');
  });

  it('falls back to Portuguese when the browser reports no supported language', () => {
    const languageUtils = {
      getBestMatchFromCodes: jest.fn(() => undefined),
    };

    expect(resolveDetectedLanguage([], languageUtils, 'pt-PT')).toBe('pt-PT');
  });
});
