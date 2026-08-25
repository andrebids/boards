const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const {
  patchServiceWorkerCache,
  patchStaticCache,
  prepareOnlyOfficeStaticAssets,
} = require('./patch-static-cache');

const fixture = `
app.use(function (req, res, next) {
    setHeaders(req, res);
    if (/[\\?\\&]ver=[^\\/]+$/.test(req.url)) { res.setHeader("Cache-Control", "max-age=31536000"); }
    else { res.setHeader("Cache-Control", "no-cache"); }
    next();
});
`;

test('disables browser caching for local OnlyOffice assets', () => {
  const patched = patchStaticCache(fixture);

  assert.match(patched, /ONLYOFFICE_LOCAL_NO_CACHE/);
  assert.doesNotMatch(patched, /public, max-age=3600/);
});

test('precompresses the x2t WebAssembly converter with Brotli', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'onlyoffice-static-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const x2tDir = path.join(root, 'x2t');
  fs.mkdirSync(x2tDir, { recursive: true });
  const source = Buffer.from('x2t-wasm-fixture-'.repeat(4096));
  fs.writeFileSync(path.join(x2tDir, 'x2t.wasm'), source);

  const result = await prepareOnlyOfficeStaticAssets(root);
  const compressed = fs.readFileSync(path.join(x2tDir, 'x2t.wasm.br'));

  assert.deepEqual(zlib.brotliDecompressSync(compressed), source);
  assert.equal(result.x2tCompressed, true);
});

test('exposes the OnlyOffice service worker at the version root', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'onlyoffice-static-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sourceDir = path.join(root, 'v9', 'sdkjs', 'common', 'serviceworker');
  fs.mkdirSync(sourceDir, { recursive: true });
  const worker = 'var g_cacheNamePrefix="document_editor_static_";';
  fs.writeFileSync(path.join(sourceDir, 'document_editor_service_worker.js'), worker);
  fs.writeFileSync(
    path.join(sourceDir, 'document_editor_service_worker.js.br'),
    zlib.brotliCompressSync(Buffer.from(worker)),
  );

  const result = await prepareOnlyOfficeStaticAssets(root);

  assert.equal(
    fs.readFileSync(path.join(root, 'v9', 'document_editor_service_worker.js'), 'utf8'),
    'var g_cacheNamePrefix="document_editor_static_planka_import_20260825_4_";',
  );
  assert.equal(
    zlib
      .brotliDecompressSync(
        fs.readFileSync(path.join(root, 'v9', 'document_editor_service_worker.js.br')),
      )
      .toString('utf8'),
    'var g_cacheNamePrefix="document_editor_static_planka_import_20260825_4_";',
  );
  assert.equal(result.serviceWorkerLinked, true);
});

test('uses a new service-worker cache namespace when the native import action changes', () => {
  const worker = 'var g_cacheNamePrefix="document_editor_static_";';
  const patched = patchServiceWorkerCache(worker);

  assert.match(patched, /document_editor_static_planka_import_20260825_4_/);
  assert.equal(patchServiceWorkerCache(patched), patched);
});

test('upgrades the prior presentation-import service-worker cache namespace', () => {
  const worker = 'var g_cacheNamePrefix="document_editor_static_planka_import_20260825_3_";';

  assert.match(patchServiceWorkerCache(worker), /document_editor_static_planka_import_20260825_4_/);
});

test('preserves CryptPad cache behavior for every other resource', () => {
  const patched = patchStaticCache(fixture);

  assert.match(patched, /ver=\[\^\\\/\]\+\$.*max-age=31536000/);
  assert.match(patched, /else \{ res\.setHeader\("Cache-Control", "no-cache"\); \}/);
});

test('does not apply the local cache patch twice', () => {
  const patched = patchStaticCache(fixture);

  assert.equal(patchStaticCache(patched), patched);
});

test('fails startup visibly if the CryptPad cache hook changes upstream', () => {
  assert.throws(
    () => patchStaticCache('app.use(function () {});'),
    /CryptPad static cache patch no longer applies/,
  );
});
