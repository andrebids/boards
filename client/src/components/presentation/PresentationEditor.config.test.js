import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src', 'components', 'presentation', 'PresentationEditor.jsx'),
  'utf8',
);

describe('Presentation editor permissions', () => {
  test('disables printing while keeping presentation downloads available', () => {
    expect(source).toMatch(
      /permissions:\s*\{\s*chat: false,\s*download: true,\s*print: false\s*\}/,
    );
  });
});
