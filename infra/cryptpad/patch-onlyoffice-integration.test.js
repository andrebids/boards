const test = require('node:test');
const assert = require('node:assert/strict');

const { patchOnlyOfficeIntegration } = require('./patch-onlyoffice-integration');

const fixture = `
        const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();
};

            APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                return void cb();
            };
`;

test('routes Presentation local-image requests through the CryptPad picker', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /APP\.ooconfig\.documentType !== 'presentation'/);
  assert.match(patched, /APP\.AddImage/);
  assert.match(patched, /editor\.AddImageUrl\(\[image\.name\]\)/);
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

test('restores the CryptPad picker when OnlyOffice reassigns its image method during startup', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /const openCryptPadImagePicker = function\(\)/);
  assert.match(patched, /editor\.asc_addImage !== openCryptPadImagePicker/);
});

test('uploads dropped presentation images through CryptPad before returning their URLs to OnlyOffice', () => {
  const patched = patchOnlyOfficeIntegration(fixture);

  assert.match(patched, /APP\.UploadImageFiles = function \(files, type, id, jwt, cb\)/);
  assert.match(patched, /APP\.FMImages\.handleFile\(file, handleFileData\)/);
  assert.match(patched, /cb\(0, urls\)/);
});

test('fails the image build if the CryptPad hook changes upstream', () => {
  assert.throws(
    () => patchOnlyOfficeIntegration('const onDocumentReady = function() {};'),
    /OnlyOffice image picker patch no longer applies/,
  );
});
