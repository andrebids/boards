const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');

const fsp = fs.promises;

const marker = 'ONLYOFFICE_LOCAL_NO_CACHE';
const serviceWorkerCacheMarker = 'document_editor_static_planka_import_20260826_10_';
const previousServiceWorkerCacheMarker = 'document_editor_static_planka_import_20260825_9_';
const legacyServiceWorkerCacheMarker = 'document_editor_static_planka_import_20260825_8_';
const olderLegacyServiceWorkerCacheMarker = 'document_editor_static_planka_import_20260825_7_';
const originalCachePolicy = `    if (/[\\?\\&]ver=[^\\/]+$/.test(req.url)) { res.setHeader("Cache-Control", "max-age=31536000"); }
    else { res.setHeader("Cache-Control", "no-cache"); }`;
const legacyLocalCachePolicy = `    // ONLYOFFICE_LOCAL_CACHE: let the browser reuse the versioned editor bundle in dev.
    if (/^\\/common\\/onlyoffice\\/dist\\/(?:v[0-9]+|x2t)\\//.test(req.url)) {
        res.setHeader("Cache-Control", "public, max-age=3600");
    } else if (/[\\?\\&]ver=[^\\/]+$/.test(req.url)) { res.setHeader("Cache-Control", "max-age=31536000"); }
    else { res.setHeader("Cache-Control", "no-cache"); }`;
const localCachePolicy = `    // ONLYOFFICE_LOCAL_NO_CACHE: editor bundles must refresh during local development.
    if (/[\\?\\&]ver=[^\\/]+$/.test(req.url)) { res.setHeader("Cache-Control", "max-age=31536000"); }
    else { res.setHeader("Cache-Control", "no-cache"); }`;

function patchStaticCache(source) {
  if (source.includes(marker)) {
    return source;
  }

  if (source.includes(legacyLocalCachePolicy)) {
    return source.replace(legacyLocalCachePolicy, localCachePolicy);
  }

  if (source.includes(originalCachePolicy)) {
    return source.replace(originalCachePolicy, localCachePolicy);
  }

  throw new Error('CryptPad static cache patch no longer applies');
}

function patchServiceWorkerCache(source) {
  if (source.includes(serviceWorkerCacheMarker)) {
    return source;
  }

  for (const previousMarker of [
    previousServiceWorkerCacheMarker,
    legacyServiceWorkerCacheMarker,
    olderLegacyServiceWorkerCacheMarker,
  ]) {
    if (source.includes(previousMarker)) {
      return source.replace(previousMarker, serviceWorkerCacheMarker);
    }
  }

  const cachePrefix = 'var g_cacheNamePrefix="document_editor_static_";';
  if (!source.includes(cachePrefix)) {
    throw new Error('OnlyOffice service worker cache patch no longer applies');
  }

  return source.replace(
    cachePrefix,
    `var g_cacheNamePrefix="${serviceWorkerCacheMarker}";`,
  );
}

async function isCurrent(sourcePath, targetPath) {
  try {
    const [source, target] = await Promise.all([
      fsp.stat(sourcePath),
      fsp.stat(targetPath),
    ]);
    return target.mtimeMs >= source.mtimeMs;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function compressBrotli(sourcePath, targetPath) {
  if (await isCurrent(sourcePath, targetPath)) {
    return false;
  }

  const temporaryPath = `${targetPath}.${process.pid}.tmp`;
  await fsp.rm(temporaryPath, { force: true });
  try {
    await pipeline(
      fs.createReadStream(sourcePath),
      zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
        },
      }),
      fs.createWriteStream(temporaryPath),
    );
    await fsp.rm(targetPath, { force: true });
    await fsp.rename(temporaryPath, targetPath);
  } catch (error) {
    await fsp.rm(temporaryPath, { force: true });
    throw error;
  }
  return true;
}

async function exposeFile(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  if (await isCurrent(sourcePath, targetPath)) {
    return true;
  }

  await fsp.rm(targetPath, { force: true });
  try {
    await fsp.link(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV' && error.code !== 'EPERM') {
      throw error;
    }
    await fsp.copyFile(sourcePath, targetPath);
  }
  return true;
}

async function exposeServiceWorker(versionRoot, fileName) {
  return exposeFile(
    path.join(versionRoot, 'sdkjs', 'common', 'serviceworker', fileName),
    path.join(versionRoot, fileName),
  );
}

async function exposeOnlyOfficeMetadata(distRoot, versionRoot) {
  const files = [
    [path.join(distRoot, '..', 'plugins.json'), path.join(versionRoot, 'plugins.json')],
    [
      path.join(versionRoot, 'web-apps', 'apps', 'common', 'main', 'resources', 'themes', 'themes.json'),
      path.join(versionRoot, 'themes.json'),
    ],
  ];

  for (const [sourcePath, targetPath] of files) {
    JSON.parse(await fsp.readFile(sourcePath, 'utf8'));
    await exposeFile(sourcePath, targetPath);
  }
  return true;
}

async function patchServiceWorkerFile(filePath) {
  const isBrotliAsset = filePath.endsWith('.br');
  const asset = await fsp.readFile(filePath);
  const source = isBrotliAsset ? zlib.brotliDecompressSync(asset).toString('utf8') : asset.toString('utf8');
  const patched = patchServiceWorkerCache(source);

  if (patched === source) {
    return false;
  }

  const nextAsset = isBrotliAsset ? zlib.brotliCompressSync(Buffer.from(patched)) : patched;
  await fsp.writeFile(filePath, nextAsset);
  return true;
}

async function prepareOnlyOfficeStaticAssets(distRoot) {
  const x2tPath = path.join(distRoot, 'x2t', 'x2t.wasm');
  const x2tCompressed = fs.existsSync(x2tPath)
    ? await compressBrotli(x2tPath, `${x2tPath}.br`)
    : false;

  const entries = await fsp.readdir(distRoot, { withFileTypes: true });
  const versionRoots = entries
    .filter((entry) => entry.isDirectory() && /^v[0-9]+$/.test(entry.name))
    .map((entry) => path.join(distRoot, entry.name));
  const serviceWorkerResults = await Promise.all(
    versionRoots.flatMap((versionRoot) => [
      (async () => {
        const fileName = 'document_editor_service_worker.js';
        const sourcePath = path.join(versionRoot, 'sdkjs', 'common', 'serviceworker', fileName);
        await patchServiceWorkerFile(sourcePath);
        const exposed = await exposeServiceWorker(versionRoot, fileName);
        await patchServiceWorkerFile(path.join(versionRoot, fileName));
        return exposed;
      })(),
      (async () => {
        const fileName = 'document_editor_service_worker.js.br';
        const sourcePath = path.join(versionRoot, 'sdkjs', 'common', 'serviceworker', fileName);
        await patchServiceWorkerFile(sourcePath);
        const exposed = await exposeServiceWorker(versionRoot, fileName);
        await patchServiceWorkerFile(path.join(versionRoot, fileName));
        return exposed;
      })(),
    ]),
  );
  const metadataResults = await Promise.all(
    versionRoots.map((versionRoot) => exposeOnlyOfficeMetadata(distRoot, versionRoot)),
  );

  return {
    metadataLinked: metadataResults.every(Boolean),
    x2tCompressed,
    serviceWorkerLinked: serviceWorkerResults.some(Boolean),
  };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const assetsOnly = args[0] === '--assets-only';
    const filePath = assetsOnly ? undefined : args[0] || '/cryptpad/lib/http-worker.js';
    const distRoot = args[1] || '/cryptpad/www/common/onlyoffice/dist';
    if (filePath) {
      const source = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(filePath, patchStaticCache(source));
    }
    const result = await prepareOnlyOfficeStaticAssets(distRoot);
    console.log(`Prepared OnlyOffice static assets: ${JSON.stringify(result)}`);
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { patchServiceWorkerCache, patchStaticCache, prepareOnlyOfficeStaticAssets };
