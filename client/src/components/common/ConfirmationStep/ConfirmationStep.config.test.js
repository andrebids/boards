import fs from 'fs';
import path from 'path';

const componentPath = path.join(
  process.cwd(),
  'src',
  'components',
  'common',
  'ConfirmationStep',
  'ConfirmationStep.jsx',
);

describe('ConfirmationStep', () => {
  test('uses the shared alert dialog and preserves the popup back action', () => {
    const source = fs.readFileSync(componentPath, 'utf8');

    expect(source).toMatch(/AlertDialog/);
    expect(source).toMatch(/onCancel=\{onBack \|\| onClose\}/);
    expect(source).toMatch(/initialFocusRef=\{typeValue \? nameFieldRef : undefined\}/);
  });
});
