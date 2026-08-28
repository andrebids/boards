import fs from 'fs';
import path from 'path';

const componentPath = path.join(process.cwd(), 'src', 'components', 'common', 'Fixed', 'Fixed.jsx');

describe('Fixed chat layering', () => {
  test('renders fixed chat surfaces outside the application stacking context', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/<\/div>\s*<ChatLauncher \/>\s*<ChatDock \/>\s*<\/ChatProvider>/);
  });
});
