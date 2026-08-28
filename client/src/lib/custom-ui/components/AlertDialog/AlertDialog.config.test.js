import fs from 'fs';
import path from 'path';

const componentPath = path.join(process.cwd(), 'src', 'lib', 'custom-ui', 'components', 'AlertDialog', 'AlertDialog.jsx');

describe('AlertDialog', () => {
  test('defines the shared critical-confirmation contract', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/role="alertdialog"/);
    expect(source).toMatch(/closeOnDimmerClick=\{isDismissable\}/);
    expect(source).toMatch(/closeOnEscape=\{isDismissable\}/);
    expect(source).toMatch(/variant=\{tone === 'danger' \? 'danger' : 'primary'\}/);
  });
});
