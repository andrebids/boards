import fs from 'fs';
import path from 'path';

const componentPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'custom-ui',
  'components',
  'AlertDialog',
  'AlertDialog.jsx',
);
const stylesPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'custom-ui',
  'components',
  'AlertDialog',
  'AlertDialog.module.scss',
);

describe('AlertDialog', () => {
  test('defines the shared critical-confirmation contract', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/role="alertdialog"/);
    expect(source).toMatch(/closeOnDimmerClick=\{isDismissable\}/);
    expect(source).toMatch(/closeOnEscape=\{isDismissable\}/);
    expect(source).toMatch(/dimmer=\{\{ className: 'glass-dimmer' \}\}/);
    expect(source).not.toMatch(/dimmer=\{\{ inverted: true/);
    expect(source).toMatch(/variant=\{tone === 'danger' \? 'danger' : 'primary'\}/);
  });

  test('keeps content and actions inside one visual surface', () => {
    const source = fs.readFileSync(stylesPath, 'utf8');

    expect(source).toMatch(/\.modal:global\(\.ui\.basic\.modal\.glass\) \{/);
    expect(source).toMatch(/background: rgba\(14, 17, 23, 0\.75\) !important;/);
    expect(source).toMatch(
      /\.modal:global\(\.ui\.basic\.modal\.glass\) > \.content:global\(\.content\) \{[\s\S]*background: transparent !important;/,
    );
  });
});
