const test = require('node:test');
const assert = require('node:assert/strict');

const { patchOnlyOfficeIntegration } = require('./patch-onlyoffice-integration');

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
  assert.match(patched, /image\.blob/);
  assert.match(patched, /URL\.createObjectURL\(image\.blob\)/);
  assert.match(patched, /redirectPresentationImageUpload\(\);/);
});

test('does not apply the image picker patch twice', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.equal(patchOnlyOfficeIntegration(patched), patched);
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

test('restores the host image picker when OnlyOffice reassigns its image method during startup', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /const openProjectImagePicker = function\(editor\)/);
  assert.match(patched, /editor\.asc_addImage !== openProjectImagePicker/);
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
