const fs = require('node:fs');

const documentReadyMarker = `const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();`;

const documentReadyReplacement = `const redirectPresentationImageUpload = function() {
            if (APP.ooconfig.documentType !== 'presentation') { return; }

            var attempt = 0;
            const installImagePicker = function() {
                var editor = getEditor();
                if (!editor || !editor.asc_addImage) {
                    attempt++;
                    if (attempt < 200) {
                        window.setTimeout(installImagePicker, 50);
                    }
                    return;
                }

                if (editor.__cryptpadImagePicker) { return; }

                editor.__cryptpadImagePicker = true;
                editor.asc_addImage = function() {
                    APP.AddImage(function(image) {
                        if (!image || !image.name) { return; }
                        editor.AddImageUrl([image.name]);
                    }, function() {});
                };
            };

            installImagePicker();
        };

        const onDocumentReady = function(lock, lang, fromContent, file, force) {
            redirectPresentationImageUpload();
            evOnSync.fire();`;

function patchOnlyOfficeIntegration(source) {
  if (source.includes('const redirectPresentationImageUpload = function()')) {
    return source;
  }

  if (!source.includes(documentReadyMarker)) {
    throw new Error('OnlyOffice image picker patch no longer applies');
  }

  return source.replace(documentReadyMarker, documentReadyReplacement);
}

function patchFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const patched = patchOnlyOfficeIntegration(source);

  if (patched !== source) {
    fs.writeFileSync(filePath, patched);
  }
}

if (require.main === module) {
  const isCheck = process.argv[2] === '--check';
  const filePath = process.argv[isCheck ? 3 : 2] || '/cryptpad/www/common/onlyoffice/inner.js';

  if (isCheck) {
    patchOnlyOfficeIntegration(fs.readFileSync(filePath, 'utf8'));
  } else {
    patchFile(filePath);
  }
}

module.exports = {
  patchOnlyOfficeIntegration,
};
