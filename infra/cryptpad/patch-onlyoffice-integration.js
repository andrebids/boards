const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const documentReadyMarker = `const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();`;

const uploadImageFilesMarker = `APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                return void cb();
            };`;

const presentationToolbarMarker =
  'e.btnsInsertImage.forEach((function(i){i.updateHint(e.tipInsertImage),i.setMenu(new Common.UI.Menu({items:[{caption:e.mniImageFromFile,value:"file"},{cls:"cp-from-url",caption:e.mniImageFromUrl,value:"url"},{caption:e.mniImageFromStorage,value:"storage"}]}).on("item:click",(function(t,i,n){e.fireEvent("insert:image",[i.value])}))),i.menu.items[2].setVisible(t.canRequestInsertImage||t.fileChoiceUrl&&t.fileChoiceUrl.indexOf("{documentType}")>-1)}))';

const presentationToolbarReplacement =
  'e.btnsInsertImage.forEach((function(i){i.updateHint(e.tipInsertImage),i.on("click",(function(){e.fireEvent("insert:image",["file"])}))}))';

const presentationImportToolbarMarker = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>`;

const presentationImportToolbarReplacement = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-planka-presentation-import"></span>\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>`;

const previousPresentationImportToolbarReplacement = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-inserttable"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-planka-presentation-import"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge slot-insertimg"></span>\n                </div>`;

const legacyPresentationImportToolbarMarker = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-insertequation"></span>\n                    <span class="btn-slot text x-huge" id="slot-btn-inssymbol"></span>\n                </div>\n                <div class="separator media long"></div>`;

const legacyPresentationImportToolbarReplacement = String.raw`                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-insertequation"></span>\n                    <span class="btn-slot text x-huge" id="slot-btn-inssymbol"></span>\n                </div>\n                <div class="separator long"></div>\n                <div class="group">\n                    <span class="btn-slot text x-huge" id="slot-btn-planka-presentation-import"></span>\n                </div>\n                <div class="separator media long"></div>`;

const presentationImportToolbarSlot = 'id="slot-btn-planka-presentation-import"';

const presentationImportRuntimeMarker = 'const plankaPresentationImportButtonId';
const presentationImportFileMenuMarker = 'const plankaPresentationImportFileMenuId';

const legacyPresentationImportIcon = `        const icon = document.createElement('i');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'icon toolbar__icon btn-ic-insertimage';
        icon.innerHTML = '&nbsp;';`;

const presentationImportIcon = `        const icon = document.createElement('span');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'toolbar__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.backgroundImage = 'none';
        icon.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" focusable="false"><path d="M7 3h12l6 6v20H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3v7h6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';`;

const presentationImportFileMenuRuntime = `
    const plankaPresentationImportFileMenuId = 'fm-btn-planka-presentation-import';

    const installPlankaPresentationImportFileMenu = function () {
        const saveItem = document.getElementById('fm-btn-save');
        if (!saveItem || document.getElementById(plankaPresentationImportFileMenuId)) { return; }

        const language = (navigator.language || 'en').toLowerCase();
        const label = language.indexOf('pt') === 0 ? 'Abrir PowerPoint' : 'Open PowerPoint';
        const menuItem = saveItem.cloneNode(true);
        const caption = menuItem.querySelector('.caption');
        const icon = menuItem.querySelector('.menu__icon');

        menuItem.id = plankaPresentationImportFileMenuId;
        menuItem.removeAttribute('data-layout-name');
        menuItem.setAttribute('aria-label', label);
        if (caption) { caption.textContent = label; }
        if (icon) { icon.className = 'menu__icon btn-open'; }
        menuItem.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = plankaPresentationImportAccept;
            input.addEventListener('change', function () {
                const file = input.files && input.files[0];
                if (!file) { return; }
                window.top.postMessage({ type: plankaPresentationImportMessageType, file: file }, '*');
            });
            input.click();
        });
        saveItem.insertAdjacentElement('afterend', menuItem);
    };
`;

const presentationImportRuntime = `
;(function () {
    const plankaPresentationImportButtonId = 'planka-presentation-import';
    const plankaPresentationImportMessageType = 'planka:presentation-import';
    const plankaPresentationImportAccept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';

    const installPlankaPresentationImportButton = function () {
        const slot = document.getElementById('slot-btn-planka-presentation-import');
        if (!slot || document.getElementById(plankaPresentationImportButtonId)) { return; }

        const language = (navigator.language || 'en').toLowerCase();
        const label = language.indexOf('pt') === 0 ? 'Importar PowerPoint' : 'Import PowerPoint';
        const button = document.createElement('button');
        const icon = document.createElement('span');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'toolbar__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.backgroundImage = 'none';
        icon.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" focusable="false"><path d="M7 3h12l6 6v20H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3v7h6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        caption.className = 'caption';
        caption.textContent = label;
        button.appendChild(icon);
        button.appendChild(caption);
        button.addEventListener('click', function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
            input.addEventListener('change', function () {
                const file = input.files && input.files[0];
                if (!file) { return; }
                window.top.postMessage({ type: 'planka:presentation-import', file: file }, '*');
            });
            input.click();
        });
        slot.appendChild(button);
    };

${presentationImportFileMenuRuntime}
    window.setInterval(function () {
        installPlankaPresentationImportButton();
        installPlankaPresentationImportFileMenu();
    }, 100);
}());
`;

const projectImagePickerReplacement = `            const openProjectImagePicker = function(editor, options) {
                var sframeChan = common.getSframeChannel();
                if (!sframeChan) { return; }

                sframeChan.query('Q_INTEGRATION_ON_INSERT_IMAGE', {}, function(queryError, image) {
                    if (queryError || !image || !image.blob) { return; }
                    var name = image.name || ('image-' + Util.uid() + '.png');
                    var file = image.blob;
                    file.name = name;
                    APP.UploadImageFiles([file], null, null, null, function(error, urls) {
                        if (error || !urls || !urls.length) { return; }
                        editor._addImageUrl(urls, options);
                    });
                }, { raw: true });
            };`;

const documentReadyReplacement = `const redirectPresentationImageUpload = function() {
            if (APP.ooconfig.documentType !== 'presentation') { return; }

            var attempt = 0;
${projectImagePickerReplacement}
            const installImagePicker = function() {
                var editor = getEditor();
                if (editor && editor.asc_addImage && editor.asc_addImage !== openProjectImagePicker) {
                    editor.asc_addImage = function(options) {
                        openProjectImagePicker(editor, options);
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
  let patched = source;
  const hasLegacyImagePicker =
    patched.includes('const redirectPresentationImageUpload = function()') &&
    (
      !patched.includes('function(queryError, image)') ||
      !patched.includes('var file = image.blob;') ||
      !patched.includes('APP.UploadImageFiles([file], null, null, null, function(error, urls)')
    );

  if (hasLegacyImagePicker) {
    patched = patched.replace(
      /            const openProjectImagePicker = function\(editor(?:, options)?\) \{[\s\S]*?\n            \};\n            const installImagePicker/,
      `${projectImagePickerReplacement}\n            const installImagePicker`,
    )
      .replace('editor.asc_addImage = function()', 'editor.asc_addImage = function(options)')
      .replace('openProjectImagePicker(editor)', 'openProjectImagePicker(editor, options)');
  }

  let dropPatchStart = patched.indexOf('const uploadDroppedPresentationImages = function(files, cb)');
  let dropPatchEnd = dropPatchStart === -1
    ? -1
    : patched.indexOf('APP.UploadImageFiles = function (files, type, id, jwt, cb)', dropPatchStart);
  let dropPatchSource = dropPatchStart === -1 || dropPatchEnd === -1
    ? ''
    : patched.slice(dropPatchStart, dropPatchEnd);

  if (dropPatchSource.includes('ev.callback(ev.name);')) {
    const upgradedDropPatch = dropPatchSource.replace(
      '                            ev.callback(ev.name);',
      `                            getImageURL(ev.name).then(function(url) {
                                ev.callback(url);
                            });`,
    );
    patched = patched.slice(0, dropPatchStart) + upgradedDropPatch + patched.slice(dropPatchEnd);
    dropPatchEnd = patched.indexOf(
      'APP.UploadImageFiles = function (files, type, id, jwt, cb)',
      dropPatchStart,
    );
    dropPatchSource = patched.slice(dropPatchStart, dropPatchEnd);
  }

  const hasPickerPatch =
    patched.includes('const redirectPresentationImageUpload = function()') &&
    patched.includes('function(queryError, image)') &&
    patched.includes('var file = image.blob;') &&
    patched.includes('APP.UploadImageFiles([file], null, null, null, function(error, urls)');
  const hasDropPatch = dropPatchSource.includes('getImageURL(ev.name).then(function(url)');

  if (hasPickerPatch && hasDropPatch) {
    return patched;
  }

  if (
    (!hasPickerPatch && !patched.includes(documentReadyMarker)) ||
    (!hasDropPatch && !patched.includes(uploadImageFilesMarker))
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

  if (!hasPickerPatch) {
    patched = patched.replace(documentReadyMarker, documentReadyReplacement);
  }
  if (!hasDropPatch) {
    patched = patched.replace(uploadImageFilesMarker, uploadImageFilesReplacement);
  }
  return patched;
}

function patchPresentationToolbar(source) {
  if (source.includes(presentationToolbarReplacement)) {
    return source;
  }

  if (!source.includes(presentationToolbarMarker)) {
    throw new Error('OnlyOffice presentation toolbar patch no longer applies');
  }

  return source.replace(presentationToolbarMarker, presentationToolbarReplacement);
}

function patchPresentationImportToolbar(source) {
  let patched = source;

  if (patched.includes(previousPresentationImportToolbarReplacement)) {
    patched = patched.replace(
      previousPresentationImportToolbarReplacement,
      presentationImportToolbarMarker,
    );
  }

  if (patched.includes(legacyPresentationImportToolbarReplacement)) {
    patched = patched.replace(
      legacyPresentationImportToolbarReplacement,
      legacyPresentationImportToolbarMarker,
    );
  }

  if (!patched.includes(presentationImportToolbarSlot)) {
    if (!patched.includes(presentationImportToolbarMarker)) {
      throw new Error('OnlyOffice presentation import toolbar patch no longer applies');
    }
    patched = patched.replace(presentationImportToolbarMarker, presentationImportToolbarReplacement);
  }

  if (!patched.includes(presentationImportRuntimeMarker)) {
    patched += presentationImportRuntime;
  } else if (patched.includes(legacyPresentationImportIcon)) {
    patched = patched.replace(legacyPresentationImportIcon, presentationImportIcon);
  }

  if (!patched.includes(presentationImportFileMenuMarker)) {
    const legacyInterval = '    window.setInterval(installPlankaPresentationImportButton, 100);';
    if (!patched.includes(legacyInterval)) {
      throw new Error('OnlyOffice presentation import runtime no longer applies');
    }
    patched = patched.replace(
      legacyInterval,
      `${presentationImportFileMenuRuntime}
    window.setInterval(function () {
        installPlankaPresentationImportButton();
        installPlankaPresentationImportFileMenu();
    }, 100);`,
    );
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

function patchPresentationToolbarFile(filePath) {
  const isBrotliAsset = path.extname(filePath) === '.br';
  const asset = fs.readFileSync(filePath);
  const source = isBrotliAsset ? zlib.brotliDecompressSync(asset).toString('utf8') : asset.toString('utf8');
  const imageToolbarSource =
    source.includes(presentationToolbarMarker) || source.includes(presentationToolbarReplacement)
      ? patchPresentationToolbar(source)
      : source;
  const patched = patchPresentationImportToolbar(imageToolbarSource);

  if (patched !== source) {
    fs.writeFileSync(
      filePath,
      isBrotliAsset ? zlib.brotliCompressSync(Buffer.from(patched)) : patched,
    );
  }
}

if (require.main === module) {
  const isCheck = process.argv[2] === '--check';
  const filePath = process.argv[isCheck ? 3 : 2] || '/cryptpad/www/common/onlyoffice/inner.js';

  if (isCheck) {
    patchOnlyOfficeIntegration(fs.readFileSync(filePath, 'utf8'));
  } else {
    patchFile(filePath);
    for (const toolbarPath of [
      '/cryptpad/www/common/onlyoffice/dist/v9/web-apps/apps/presentationeditor/main/app.js',
      '/cryptpad/www/common/onlyoffice/dist/v9/web-apps/apps/presentationeditor/main/ie/app.js',
      '/cryptpad/www/common/onlyoffice/dist/v9/web-apps/apps/presentationeditor/main/app.js.br',
      '/cryptpad/www/common/onlyoffice/dist/v9/web-apps/apps/presentationeditor/main/ie/app.js.br',
    ]) {
      if (fs.existsSync(toolbarPath)) {
        patchPresentationToolbarFile(toolbarPath);
      }
    }
  }
}

module.exports = {
  patchOnlyOfficeIntegration,
  patchPresentationImportToolbar,
  patchPresentationToolbarFile,
  patchPresentationToolbar,
};
