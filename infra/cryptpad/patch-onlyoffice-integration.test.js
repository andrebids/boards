const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const {
  patchOnlyOfficeIntegration,
  patchPresentationImportToolbar,
  patchPresentationToolbarFile,
  patchPresentationToolbar,
} = require('./patch-onlyoffice-integration');

const uploadImageFilesFixture = `            APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                return void cb();
            };`;

const fixture = `
        const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();
};

${uploadImageFilesFixture}
`;

test('routes Presentation image requests through the host integration callback', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /APP\.ooconfig\.documentType !== 'presentation'/);
  assert.match(patched, /Q_INTEGRATION_ON_INSERT_IMAGE/);
  assert.match(patched, /function\(queryError, image\)/);
  assert.match(patched, /if \(queryError \|\| !image \|\| !image\.blob\)/);
  assert.match(patched, /\}, \{ raw: true \}\);/);
  assert.match(patched, /image\.blob/);
  assert.match(patched, /var file = image\.blob;/);
  assert.match(patched, /file\.name = name;/);
  assert.doesNotMatch(patched, /new File\(/);
  assert.match(patched, /APP\.UploadImageFiles\(\[file\], null, null, null, function\(error, urls\)/);
  assert.match(patched, /editor\._addImageUrl\(urls, options\)/);
  assert.doesNotMatch(patched, /URL\.createObjectURL\(image\.blob\)/);
  assert.match(patched, /redirectPresentationImageUpload\(\);/);
});

test('does not apply the image picker patch twice', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.equal(patchOnlyOfficeIntegration(patched), patched);
});

test('upgrades the previously installed temporary-URL image picker', () => {
  const current = patchOnlyOfficeIntegration(fixture);
  const legacy = current
    .replace('const openProjectImagePicker = function(editor, options)', 'const openProjectImagePicker = function(editor)')
    .replace(
      `                    var name = image.name || ('image-' + Util.uid() + '.png');
                    var file = image.blob;
                    file.name = name;
                    APP.UploadImageFiles([file], null, null, null, function(error, urls) {
                        if (error || !urls || !urls.length) { return; }
                        editor._addImageUrl(urls, options);
                    });`,
      `                    var imageUrl = window.URL.createObjectURL(image.blob);
                    editor.asc_addImageCallback({ name: image.name, url: imageUrl });
                    editor._addImageUrl([imageUrl]);
                    window.setTimeout(function() {
                        window.URL.revokeObjectURL(imageUrl);
                    }, 60000);`,
    )
    .replace('editor.asc_addImage = function(options)', 'editor.asc_addImage = function()')
    .replace('openProjectImagePicker(editor, options)', 'openProjectImagePicker(editor)');

  const upgraded = patchOnlyOfficeIntegration(legacy);

  assert.match(upgraded, /APP\.UploadImageFiles\(\[file\]/);
  assert.match(upgraded, /editor\._addImageUrl\(urls, options\)/);
  assert.doesNotMatch(upgraded, /URL\.createObjectURL\(image\.blob\)/);
});

test('upgrades the legacy encrypted-media upload that returned only the image name', () => {
  const current = patchOnlyOfficeIntegration(fixture);
  const legacy = current.replace(
    `                            getImageURL(ev.name).then(function(url) {
                                ev.callback(url);
                            });`,
    '                            ev.callback(ev.name);',
  );

  const upgraded = patchOnlyOfficeIntegration(legacy);

  assert.match(upgraded, /getImageURL\(ev\.name\)\.then\(function\(url\)/);
  assert.match(upgraded, /ev\.callback\(url\)/);
  assert.doesNotMatch(upgraded, /ev\.callback\(ev\.name\)/);
});

test('adds drag-and-drop support to an image-picker patch already installed in production', () => {
  const pickerOnly = patchOnlyOfficeIntegration(fixture)
    .replace(/const uploadDroppedPresentationImages[\s\S]*?APP\.UploadImageFiles = function \(files, type, id, jwt, cb\) \{[\s\S]*?\n            \};/, uploadImageFilesFixture);

  const patched = patchOnlyOfficeIntegration(pickerOnly);

  assert.match(patched, /const redirectPresentationImageUpload = function\(\)/);
  assert.match(patched, /const uploadDroppedPresentationImages = function\(files, cb\)/);
});

test('retries until the OnlyOffice image API is available after document ready', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /window\.setTimeout\(installImagePicker, 50\)/);
  assert.match(patched, /attempt < 1200/);
});

test('restores the host image picker and preserves OnlyOffice insertion options during startup', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /const openProjectImagePicker = function\(editor, options\)/);
  assert.match(patched, /editor\.asc_addImage !== openProjectImagePicker/);
  assert.match(patched, /editor\.asc_addImage = function\(options\)/);
  assert.match(patched, /openProjectImagePicker\(editor, options\)/);
});

test('uploads dropped presentation images through CryptPad before returning their URLs to OnlyOffice', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /APP\.UploadImageFiles = function \(files, type, id, jwt, cb\)/);
  assert.match(patched, /APP\.FMImages\.handleFile\(file, handleFileData\)/);
  assert.match(patched, /getImageURL\(ev\.name\)\.then\(function\(url\)/);
  assert.match(patched, /cb\(0, urls\)/);
});

test('fails the image build if the CryptPad hook changes upstream', () => {
  assert.throws(
    () => patchOnlyOfficeIntegration('const onDocumentReady = function() {};'),
    /OnlyOffice image picker patch no longer applies/,
  );
});

test('turns the presentation image toolbar control into a single picker action', () => {
  const source =
    'e.btnsInsertImage.forEach((function(i){i.updateHint(e.tipInsertImage),i.setMenu(new Common.UI.Menu({items:[{caption:e.mniImageFromFile,value:"file"},{cls:"cp-from-url",caption:e.mniImageFromUrl,value:"url"},{caption:e.mniImageFromStorage,value:"storage"}]}).on("item:click",(function(t,i,n){e.fireEvent("insert:image",[i.value])}))),i.menu.items[2].setVisible(t.canRequestInsertImage||t.fileChoiceUrl&&t.fileChoiceUrl.indexOf("{documentType}")>-1)}))';
  const patched = patchPresentationToolbar(source);

  assert.match(patched, /i\.on\("click"/);
  assert.match(patched, /insert:image/);
  assert.doesNotMatch(patched, /setMenu/);
  assert.equal(patchPresentationToolbar(patched), patched);
});

test('adds the PowerPoint import action directly to the native Insert toolbar', () => {
  const source =
    String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>`;
  const patched = patchPresentationImportToolbar(source);

  assert.match(patched, /slot-btn-planka-presentation-import/);
  assert.ok(patched.indexOf('slot-btn-planka-presentation-import') < patched.indexOf('slot-insertimg'));
  assert.match(patched, /slot-btn-planka-presentation-import"><\/span>\\n                    <span class="btn-slot text x-huge slot-insertimg/);
  assert.match(patched, /window\.top\.postMessage\(\{ type: 'planka:presentation-import', file: file \}, '\*'\)/);
  assert.match(patched, /input\.accept = '\.pptx,application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation'/);
  assert.match(patched, /viewBox="0 0 32 32"/);
  assert.match(patched, /plankaPresentationImportVerticalLayout = true/);
  assert.match(patched, /button\.style\.flexDirection = 'column'/);
  assert.match(patched, /plankaPresentationImportTransparentButton = true/);
  assert.match(patched, /button\.style\.background = 'transparent'/);
  assert.doesNotMatch(patched, /button\.className = 'btn large btn-toolbar'/);
  assert.doesNotMatch(patched, /fm-btn-planka-presentation-import/);
  assert.equal(patchPresentationImportToolbar(patched), patched);
});

test('upgrades an existing import action to the position and icon beside Image', () => {
  const source = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>\n                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-insertequation"></span>\n                    <span class="btn-slot text x-huge" id="slot-btn-inssymbol"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-planka-presentation-import"></span>\n                </div>\n                <div class="separator media long"></div>` + `
const plankaPresentationImportButtonId
        const icon = document.createElement('i');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'icon toolbar__icon btn-ic-insertimage';
        icon.innerHTML = '&nbsp;';
    window.setInterval(installPlankaPresentationImportButton, 100);`;
  const patched = patchPresentationImportToolbar(source);

  assert.ok(patched.indexOf('slot-btn-planka-presentation-import') < patched.indexOf('slot-insertimg'));
  assert.match(patched, /id="slot-btn-planka-presentation-import"/);
  assert.doesNotMatch(patched, /btn-ic-insertimage/);
  assert.match(patched, /viewBox="0 0 32 32"/);
  assert.doesNotMatch(patched, /fm-btn-planka-presentation-import/);
});

test('patches the Brotli presentation bundle served to browsers', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'onlyoffice-toolbar-'));
  const filePath = path.join(directory, 'app.js.br');
  const source = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>`;

  try {
    fs.writeFileSync(filePath, zlib.brotliCompressSync(Buffer.from(source)));
    patchPresentationToolbarFile(filePath);

    const patched = zlib.brotliDecompressSync(fs.readFileSync(filePath)).toString('utf8');
    assert.match(patched, /slot-btn-planka-presentation-import/);
    assert.match(patched, /planka:presentation-import/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('keeps CryptPad native bootload scripts in the presentation iframe', () => {
  const innerHtml = fs.readFileSync(
    path.join(__dirname, 'customize', 'presentation', 'inner.html'),
    'utf8',
  );

  assert.match(
    innerHtml,
    /<script async data-bootload="\/common\/onlyoffice\/inner\.js" data-main="\/common\/sframe-boot\.js\?ver=1\.11" src="\/components\/requirejs\/require\.js\?ver=2\.3\.7"><\/script>/,
  );
});
