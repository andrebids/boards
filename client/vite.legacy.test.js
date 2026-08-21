import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, 'vite.config.js'), 'utf8');

describe('legacy TV browser build', () => {
  it('adds the official Vite legacy plugin to the production build', () => {
    expect(source).toMatch(/import legacy from "@vitejs\/plugin-legacy";/);
    expect(source).toMatch(/plugins:\s*\[[\s\S]*legacy\(/);
  });

  it('transpiles the module bundle for older Chromium TVs and generates polyfills', () => {
    expect(source).toMatch(/targets:\s*\["Chrome >= 49"\]/);
    expect(source).toMatch(/modernTargets:\s*\["Chrome >= 64"\]/);
    expect(source).toMatch(/modernPolyfills:\s*true/);
  });

  it('keeps browser compatibility targets in the legacy plugin alone', () => {
    expect(source).not.toContain('browserslistToEsbuild');
    expect(source).not.toMatch(/build:\s*\{\s*target:/);
  });
});
