const test = require('node:test');
const assert = require('node:assert/strict');

const { patchOnlyOfficeIntegration } = require('./patch-onlyoffice-integration');

const fixture = `
        const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();
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

test('fails the image build if the CryptPad hook changes upstream', () => {
  assert.throws(
    () => patchOnlyOfficeIntegration('const onDocumentReady = function() {};'),
    /OnlyOffice image picker patch no longer applies/,
  );
});
