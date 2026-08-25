const fs = require('node:fs');

const documentReadyMarker = `const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();`;

const uploadImageFilesMarker = `APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                return void cb();
            };`;

const documentReadyReplacement = `const redirectPresentationImageUpload = function() {
            if (APP.ooconfig.documentType !== 'presentation') { return; }

            var attempt = 0;
            const openProjectImagePicker = function(editor) {
                var sframeChan = common.getSframeChannel();
                if (!sframeChan) { return; }

                sframeChan.query('Q_INTEGRATION_ON_INSERT_IMAGE', {}, function(image) {
                    if (!image || !image.blob) { return; }
                    var imageUrl = window.URL.createObjectURL(image.blob);
                    editor.asc_addImageCallback({ name: image.name, url: imageUrl });
                    editor._addImageUrl([imageUrl]);
                    window.setTimeout(function() {
                        window.URL.revokeObjectURL(imageUrl);
                    }, 60000);
                }, { raw: true });
            };
            const installImagePicker = function() {
                var editor = getEditor();
                if (editor && editor.asc_addImage && editor.asc_addImage !== openProjectImagePicker) {
                    editor.asc_addImage = function() {
                        openProjectImagePicker(editor);
                    };
                }

                attempt++;
                if (attempt < 1200) {
                    window.setTimeout(installImagePicker, 50);
                }
            };

            installImagePicker();
        };

        const onDocumentReady = function(lock, lang, fromContent, file, force) {
            redirectPresentationImageUpload();
            evOnSync.fire();`;

function patchOnlyOfficeIntegration(source) {
  const hasPickerPatch = source.includes('const redirectPresentationImageUpload = function()');
  const hasDropPatch = source.includes('const uploadDroppedPresentationImages = function(files, cb)');

  if (hasPickerPatch && hasDropPatch) {
    return source;
  }

  if (
    (!hasPickerPatch && !source.includes(documentReadyMarker)) ||
    (!hasDropPatch && !source.includes(uploadImageFilesMarker))
  ) {
    throw new Error('OnlyOffice image picker patch no longer applies');
  }

  const uploadImageFilesReplacement = `const uploadDroppedPresentationImages = function(files, cb) {
                var mediasSources = getMediasSources();
                var urls = [];
                var complete = 0;

                var finish = function(url) {
                    urls.push(url);
                    complete++;
                    if (complete !== files.length) { return; }
                    APP.onLocal();
                    cb(0, urls);
                };

                if (!APP.FMImages) {
                    APP.FMImages = common.createFileManager({
                        noHandlers: true,
                        noStore: true,
                        body: $('body'),
                        onUploaded: function(ev, data) {
                            if (!ev.callback || !data.url) { return; }
                            var parsed = Hash.parsePadUrl(data.url);
                            if (parsed.type !== 'file') { return; }
                            var secret = Hash.getSecrets('file', parsed.hash, data.password);
                            var fileHost = privateData.fileHost || privateData.origin;
                            ev.mediasSources[ev.name] = {
                                name: ev.name,
                                src: fileHost + Hash.getBlobPathFromHex(secret.channel),
                                key: Hash.encodeBase64(secret.keys.cryptKey)
                            };
                            getImageURL(ev.name).then(function(url) {
                                ev.callback(url);
                            });
                        }
                    });
                }

                files.forEach(function(file) {
                    var name = file.name || ('image-' + Util.uid() + '.png');
                    while (mediasSources[name]) {
                        name = name.replace(/(\\.[^.]+)?$/, '-' + Util.uid() + '$$&');
                    }
                    var handleFileData = {
                        name: name,
                        mediasSources: mediasSources,
                        callback: finish
                    };
                    APP.FMImages.handleFile(file, handleFileData);
                });
            };

            APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                if (APP.ooconfig.documentType !== 'presentation') { return void cb(); }
                files = Array.prototype.slice.call(files || []).filter(function(file) {
                    return file && /^image\\//.test(file.type || '');
                });
                if (!files.length) { return void cb(0, []); }
                uploadDroppedPresentationImages(files, cb);
            };`;

  let patched = source;
  if (!hasPickerPatch) {
    patched = patched.replace(documentReadyMarker, documentReadyReplacement);
  }
  if (!hasDropPatch) {
    patched = patched.replace(uploadImageFilesMarker, uploadImageFilesReplacement);
  }
  return patched;
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
