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
});
