const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const EXPECTED_MAX_UPLOAD_SIZE = 500 * 1024 * 1024;

[
  path.join(__dirname, 'config/config.js.example'),
  path.join(__dirname, '../../deploy/cryptpad/config/config.js.example'),
].forEach((configPath) => {
  test(`${path.relative(process.cwd(), configPath)} allows 500 MiB uploads`, () => {
    const source = fs.readFileSync(configPath, 'utf8');
    const context = { module: { exports: {} } };

    vm.runInNewContext(source, context);

    assert.equal(context.module.exports.maxUploadSize, EXPECTED_MAX_UPLOAD_SIZE);
  });
});
