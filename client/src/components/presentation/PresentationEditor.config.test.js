import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src', 'components', 'presentation', 'PresentationEditor.jsx'),
  'utf8',
);

describe('Presentation editor permissions', () => {
  test('shows PowerPoint import to every board member with access', () => {
    expect(source).not.toMatch(/\{canEdit && \(/);
  });

  test('disables printing while keeping presentation downloads available', () => {
    expect(source).toMatch(
      /permissions:\s*\{\s*chat: false,\s*download: true,\s*print: false\s*\}/,
    );
  });

  test('receives PowerPoint imports from the native ONLYOFFICE toolbar instead of an external toolbar', () => {
    expect(source).toMatch(/addEventListener\('message', handlePresentationImportMessage\)/);
    expect(source).not.toMatch(/pluginsData:/);
    expect(source).not.toMatch(/className=\{styles\.editorToolbar\}/);
  });

  test('starts a fresh CryptPad session for an imported PowerPoint', () => {
    expect(source).toMatch(/const importedPresentation = result\.item/);
    expect(source).toMatch(/cryptpadSessionKey:\s*null/);
    expect(source).toMatch(/cryptpadMode:\s*importedPresentation\.cryptpadMode/);
  });

  test('asks for confirmation before replacing the current presentation', () => {
    expect(source).toMatch(/window\.confirm\(t\('common\.presentationImportConfirm'\)\)/);
  });

  test('does not let the replaced editor save its previous document over the import', () => {
    expect(source).toMatch(/editorGenerationRef\.current \+= 1/);
    expect(source).toMatch(/editorGeneration !== editorGenerationRef\.current/);
  });

  test('does not bootstrap unrelated ONLYOFFICE editors before the presentation', () => {
    expect(source).not.toMatch(/getPresentationOnlyOfficePreloadUrl/);
    expect(source).not.toMatch(/preloadElement/);
  });

  test('waits thirty seconds before exporting another presentation change', () => {
    expect(source).toMatch(/autosave:\s*30/);
  });

  test('keeps the collaborative session available between presentation visits', () => {
    expect(source).toMatch(/plankaPersistentSession:\s*true/);
  });
});
