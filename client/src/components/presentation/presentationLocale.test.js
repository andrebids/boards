import getPresentationEditorLanguage from './presentationLocale';

describe('presentation editor language', () => {
  test.each([
    ['pt-PT', 'pt-PT'],
    ['pt-BR', 'pt'],
    ['fr-FR', 'fr'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['fa-IR', 'en'],
    [undefined, 'en'],
  ])('uses %s as %s in OnlyOffice', (applicationLanguage, expectedLanguage) => {
    expect(getPresentationEditorLanguage(applicationLanguage)).toBe(expectedLanguage);
  });
});
