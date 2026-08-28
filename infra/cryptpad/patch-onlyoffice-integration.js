const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const documentReadyMarker = `const onDocumentReady = function(lock, lang, fromContent, file, force) {
            evOnSync.fire();`;

const uploadImageFilesMarker = `APP.UploadImageFiles = function (files, type, id, jwt, cb) {
                return void cb();
            };`;

const onlyOfficeDocumentTypeMarker = `"documentType": file.doc,`;
const onlyOfficeDocumentTypeReplacement =
  `"documentType": file.doc === 'presentation' ? 'slide' : file.doc,`;

const corePropsMarker = `        const fixProps = (title) => {
            try {
                const props = getEditor().asc_getCoreProps();
                if (!props) { return; }
                props.title = title;
                if (!content.hashes || !Object.keys(content.hashes).length) {
                    // No CP: document is using our templates
                    // --> fix the "creator" field
                    props.creator = "";
                }
                getEditor().asc_setCoreProps(props);
            } catch {}
        };`;

const corePropsReplacement = `        const fixProps = (title) => {
            try {
                const props = getEditor().asc_getCoreProps();
                if (!props) { return; }
                var changed = false;
                if (title !== undefined && props.title !== title) {
                    props.title = title;
                    changed = true;
                }
                if ((!content.hashes || !Object.keys(content.hashes).length) && props.creator) {
                    // No CP: document is using our templates
                    // --> fix the "creator" field
                    props.creator = "";
                    changed = true;
                }
                if (changed) { getEditor().asc_setCoreProps(props); }
            } catch {}
        };`;

const onlyOfficeConfigLogMarker = `            console.error('updated config', ooconfig);`;
const onlyOfficeConfigLogReplacement = `            // PLANKA_ONLYOFFICE_CONFIG_LOG_DISABLED`;

const x2tRequestLogMarker = `        var convert = function (obj, cb) {
            console.error(obj);`;
const x2tRequestLogReplacement = `        var convert = function (obj, cb) {
            // PLANKA_X2T_REQUEST_LOG_DISABLED`;

const integrationDebugLogMarker = `        var debug = console.warn;
        //debug = function () {};`;
const integrationDebugLogReplacement = `        var debug = function () {};`;

const unsafeIframeResultLogMarker = `                UnsafeObject.modal.refresh(cfg, function (data) {
                    console.error(data);
                    cb(data);`;
const unsafeIframeResultLogReplacement = `                UnsafeObject.modal.refresh(cfg, function (data) {
                    cb(data);`;

const sframeBootReplyMarker = `    var onReply = function (msg) {
        var data = JSON.parse(msg.data);
        if (data.txid !== txid) { return; }`;
const sframeBootReplyReplacement = `    var onReply = function (msg) {
        var data = typeof(msg.data) === "string" ? JSON.parse(msg.data) : msg.data;
        if (!data || data.txid !== txid) { return; }`;

const selfDestructIntegrationMarker =
  '                if (cfg.integration) { rtConfig.metadata.selfdestruct = true; }';
const persistentIntegrationReplacement =
  "                if (cfg.integration && !cfg.integrationConfig?._?.editorConfig?.plankaPersistentSession) { rtConfig.metadata.selfdestruct = true; }";
const selfDestructIntegrationBlockMarker = `                if (cfg.integration) {
                    rtConfig.metadata = rtConfig.metadata || {};
                    rtConfig.metadata.selfdestruct = true;
                }`;
const persistentIntegrationBlockReplacement = `                if (cfg.integration && !cfg.integrationConfig?._?.editorConfig?.plankaPersistentSession) {
                    rtConfig.metadata = rtConfig.metadata || {};
                    rtConfig.metadata.selfdestruct = true;
                }`;

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
const presentationImportFileMenuRuntimeMarker =
  'window.setInterval(installPlankaPresentationImportFileMenu, 100);';
const presentationImportBinaryTransportMarker =
  'const plankaPresentationImportBinaryTransport = true';
const presentationImportMaxBytesMarker = 'const plankaPresentationImportMaxBytes';
const presentationImportVerticalLayoutMarker = 'const plankaPresentationImportVerticalLayout = true';
const presentationImportTransparentButtonMarker = 'const plankaPresentationImportTransparentButton = true';
const presentationImportCompactIconMarker = 'const plankaPresentationImportCompactIcon = true';

const legacyPresentationImportIcon = `        const icon = document.createElement('i');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'icon toolbar__icon btn-ic-insertimage';
        icon.innerHTML = '&nbsp;';`;

const legacyPresentationImportHorizontalIcon = `        const icon = document.createElement('span');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large btn-toolbar';
        button.setAttribute('aria-label', label);
        icon.className = 'toolbar__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.backgroundImage = 'none';
        icon.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" focusable="false"><path d="M7 3h12l6 6v20H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3v7h6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';`;

const legacyPresentationImportVerticalIcon = `        const plankaPresentationImportVerticalLayout = true;
        const icon = document.createElement('span');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large';
        button.style.display = 'inline-flex';
        button.style.flexDirection = 'column';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.setAttribute('aria-label', label);
        icon.className = 'toolbar__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.display = 'block';
        icon.style.backgroundImage = 'none';
        icon.innerHTML = '<svg viewBox="0 0 32 32" width="32" height="32" focusable="false"><path d="M7 3h12l6 6v20H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3v7h6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';`;

const presentationImportIcon = `        const plankaPresentationImportVerticalLayout = true;
        const plankaPresentationImportTransparentButton = true;
        const plankaPresentationImportCompactIcon = true;
        const icon = document.createElement('span');
        const caption = document.createElement('span');

        button.id = plankaPresentationImportButtonId;
        button.type = 'button';
        button.className = 'btn large';
        button.style.display = 'inline-flex';
        button.style.flexDirection = 'column';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.background = 'transparent';
        button.style.border = '0';
        button.style.boxShadow = 'none';
        button.setAttribute('aria-label', label);
        icon.className = 'toolbar__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.display = 'block';
        icon.style.backgroundImage = 'none';
        icon.innerHTML = '<svg viewBox="0 0 32 32" width="20" height="20" focusable="false"><path d="M7 3h12l6 6v20H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 3v7h6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12v10m-4-4 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';`;

const presentationImportCaption = `        const language = (navigator.language || 'en').toLowerCase();
        const label = language.indexOf('pt') === 0 ? 'Importar PowerPoint' : 'Import PowerPoint';
        const captionLabel = 'Import PPTX';
        const button = document.createElement('button');
${presentationImportIcon}
        button.title = label;
        caption.className = 'caption';
        caption.style.display = 'block';
        caption.style.marginTop = '3px';
        caption.style.whiteSpace = 'nowrap';
        caption.textContent = captionLabel;`;

const legacyPresentationImportSendFile = `    const plankaPresentationImportBinaryTransport = true;
    const sendPlankaPresentationImport = function (file) {
        const reader = new FileReader();
        reader.addEventListener('load', function () {
            const bytes = reader.result;
            if (!(bytes instanceof ArrayBuffer) || bytes.byteLength === 0) { return; }
            window.top.postMessage({
                type: plankaPresentationImportMessageType,
                file: {
                    name: file.name,
                    lastModified: file.lastModified,
                    bytes: bytes,
                },
            }, '*', [bytes]);
        });
        reader.readAsArrayBuffer(file);
    };`;

const presentationImportSendFile = `    const plankaPresentationImportBinaryTransport = true;
    const sendPlankaPresentationImport = function (file) {
        const plankaPresentationImportMaxBytes = 500 * 1024 * 1024;
        if (file.size > plankaPresentationImportMaxBytes) {
            window.top.postMessage({
                type: plankaPresentationImportMessageType,
                error: 'file-too-large',
            }, '*');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', function () {
            const bytes = reader.result;
            if (!(bytes instanceof ArrayBuffer) || bytes.byteLength === 0) { return; }
            window.top.postMessage({
                type: plankaPresentationImportMessageType,
                file: {
                    name: file.name,
                    lastModified: file.lastModified,
                    bytes: bytes,
                },
            }, '*', [bytes]);
        });
        reader.readAsArrayBuffer(file);
    };`;

const presentationImportFileMenuRuntime = `
;(function () {
    const plankaPresentationImportFileMenuId = 'fm-btn-planka-presentation-import';
    const plankaPresentationImportMessageType = 'planka:presentation-import';
    const plankaPresentationImportAccept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
${presentationImportSendFile}

    const installPlankaPresentationImportFileMenu = function () {
        const saveItem = document.getElementById('fm-btn-save');
        if (!saveItem || document.getElementById(plankaPresentationImportFileMenuId)) { return; }

        const language = (navigator.language || 'en').toLowerCase();
        const label = language.indexOf('pt') === 0 ? 'Abrir PowerPoint' : 'Open PowerPoint';
        const menuItem = saveItem.cloneNode(true);
        const link = menuItem.querySelector('a');
        const icon = menuItem.querySelector('.menu-item-icon');

        menuItem.id = plankaPresentationImportFileMenuId;
        menuItem.removeAttribute('data-layout-name');
        menuItem.classList.remove('active', 'disabled');
        if (link) {
            link.removeAttribute('id');
            link.setAttribute('aria-label', label);
            link.lastChild.textContent = label;
        }
        if (icon) {
            icon.classList.remove('btn-save');
            icon.classList.add('btn-open');
        }
        menuItem.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = plankaPresentationImportAccept;
            input.addEventListener('change', function () {
                const file = input.files && input.files[0];
                if (!file) { return; }
                sendPlankaPresentationImport(file);
            });
            input.click();
        });
        saveItem.insertAdjacentElement('afterend', menuItem);
    };

    window.setInterval(installPlankaPresentationImportFileMenu, 100);
}());
`;

const presentationImportRuntime = `
;(function () {
    const plankaPresentationImportButtonId = 'planka-presentation-import';
    const plankaPresentationImportMessageType = 'planka:presentation-import';
    const plankaPresentationImportAccept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
${presentationImportSendFile}

    const installPlankaPresentationImportButton = function () {
        const slot = document.getElementById('slot-btn-planka-presentation-import');
        if (!slot || document.getElementById(plankaPresentationImportButtonId)) { return; }

${presentationImportCaption}
        button.appendChild(icon);
        button.appendChild(caption);
        button.addEventListener('click', function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = plankaPresentationImportAccept;
            input.addEventListener('change', function () {
                const file = input.files && input.files[0];
                if (!file) { return; }
                sendPlankaPresentationImport(file);
            });
            input.click();
        });
        slot.appendChild(button);
    };

    window.setInterval(installPlankaPresentationImportButton, 100);
}());
`;

const legacyPresentationImportFileMenuSuffix = `
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
                sendPlankaPresentationImport(file);
            });
            input.click();
        });
        saveItem.insertAdjacentElement('afterend', menuItem);
    };
    window.setInterval(function () {
        installPlankaPresentationImportButton();
        installPlankaPresentationImportFileMenu();
    }, 100);`;

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
            if (APP.ooconfig.documentType !== 'slide') { return; }

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

  if (!patched.includes(onlyOfficeConfigLogReplacement)) {
    if (patched.includes(onlyOfficeConfigLogMarker)) {
      patched = patched.replace(onlyOfficeConfigLogMarker, onlyOfficeConfigLogReplacement);
    }
  }

  if (!patched.includes(onlyOfficeDocumentTypeReplacement)) {
    if (!patched.includes(onlyOfficeDocumentTypeMarker)) {
      throw new Error('OnlyOffice document type patch no longer applies');
    }
    patched = patched.replace(onlyOfficeDocumentTypeMarker, onlyOfficeDocumentTypeReplacement);
  }

  if (!patched.includes(corePropsReplacement)) {
    if (!patched.includes(corePropsMarker)) {
      throw new Error('OnlyOffice core properties patch no longer applies');
    }
    patched = patched.replace(corePropsMarker, corePropsReplacement);
  }

  patched = patched.replaceAll(
    "APP.ooconfig.documentType !== 'presentation'",
    "APP.ooconfig.documentType !== 'slide'",
  );
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
                if (APP.ooconfig.documentType !== 'slide') { return void cb(); }
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

function patchX2TLogging(source) {
  if (source.includes(x2tRequestLogReplacement)) {
    return source;
  }
  if (!source.includes(x2tRequestLogMarker)) {
    throw new Error('CryptPad x2t request log patch no longer applies');
  }
  return source.replace(x2tRequestLogMarker, x2tRequestLogReplacement);
}

function patchIntegrationLogging(source) {
  if (source.includes(integrationDebugLogReplacement)) {
    return source;
  }
  if (!source.includes(integrationDebugLogMarker)) {
    throw new Error('CryptPad integration debug log patch no longer applies');
  }
  return source.replace(integrationDebugLogMarker, integrationDebugLogReplacement);
}

function patchSframeOuterLogging(source) {
  if (!source.includes(unsafeIframeResultLogMarker)) {
    if (source.includes(unsafeIframeResultLogReplacement)) {
      return source;
    }
    throw new Error('CryptPad unsafe iframe result log patch no longer applies');
  }
  return source.replace(unsafeIframeResultLogMarker, unsafeIframeResultLogReplacement);
}

function patchSframeBootReply(source) {
  if (source.includes(sframeBootReplyReplacement)) {
    return source;
  }
  if (!source.includes(sframeBootReplyMarker)) {
    throw new Error('CryptPad sframe bootstrap reply patch no longer applies');
  }
  return source.replace(sframeBootReplyMarker, sframeBootReplyReplacement);
}

function patchPersistentIntegrationSession(source) {
  const patched = source
    .replaceAll(selfDestructIntegrationBlockMarker, persistentIntegrationBlockReplacement)
    .replaceAll(selfDestructIntegrationMarker, persistentIntegrationReplacement);
  if (patched !== source) {
    return patched;
  }
  if ((source.match(/plankaPersistentSession/g) || []).length < 2) {
    throw new Error('CryptPad persistent integration patch no longer applies');
  }
  return source;
}

function patchSourceFile(filePath, patchSource) {
  const source = fs.readFileSync(filePath, 'utf8');
  const patched = patchSource(source);

  if (patched !== source) {
    fs.writeFileSync(filePath, patched);
  }
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

  if (
    patched.includes(presentationImportBinaryTransportMarker) &&
    !patched.includes(presentationImportMaxBytesMarker)
  ) {
    if (!patched.includes(legacyPresentationImportSendFile)) {
      throw new Error('OnlyOffice presentation import size guard no longer applies');
    }
    patched = patched.replaceAll(legacyPresentationImportSendFile, presentationImportSendFile);
  }

  if (
    !patched.includes(presentationImportBinaryTransportMarker) &&
    patched.includes(
      "window.top.postMessage({ type: plankaPresentationImportMessageType, file: file }, '*');",
    )
  ) {
    patched = patched
      .replaceAll(
        "    const plankaPresentationImportAccept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';",
        `    const plankaPresentationImportAccept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';\n${presentationImportSendFile}`,
      )
      .replaceAll(
        "window.top.postMessage({ type: plankaPresentationImportMessageType, file: file }, '*');",
        'sendPlankaPresentationImport(file);',
      );
  }

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

  if (!patched.includes(presentationImportVerticalLayoutMarker)) {
    if (!patched.includes(legacyPresentationImportHorizontalIcon)) {
      throw new Error('OnlyOffice presentation import button layout no longer applies');
    }
    patched = patched.replace(legacyPresentationImportHorizontalIcon, presentationImportIcon);
  }

  if (!patched.includes(presentationImportTransparentButtonMarker)) {
    if (!patched.includes(legacyPresentationImportVerticalIcon)) {
      throw new Error('OnlyOffice presentation import button appearance no longer applies');
    }
    patched = patched.replace(legacyPresentationImportVerticalIcon, presentationImportIcon);
  }

  if (!patched.includes(presentationImportCompactIconMarker)) {
    const compactIconPatchStart = patched.indexOf(presentationImportRuntimeMarker);
    const compactIconPatchSource = patched.slice(compactIconPatchStart);
    const compactIconPatch = compactIconPatchSource
      .replace(
        presentationImportTransparentButtonMarker,
        `${presentationImportTransparentButtonMarker};\n        ${presentationImportCompactIconMarker}`,
      )
      .replace('viewBox="0 0 32 32" width="32" height="32"', 'viewBox="0 0 32 32" width="20" height="20"');
    if (compactIconPatch === compactIconPatchSource) {
      throw new Error('OnlyOffice presentation import icon patch no longer applies');
    }
    patched = patched.slice(0, compactIconPatchStart) + compactIconPatch;
  }

  const captionPatchStart = patched.indexOf(presentationImportRuntimeMarker);
  const captionPatchSource = patched.slice(captionPatchStart);
  if (
    !captionPatchSource.includes('caption.textContent = captionLabel;') &&
    captionPatchSource.includes('caption.textContent = label;')
  ) {
    let captionPatch = captionPatchSource;
    if (!captionPatch.includes('const captionLabel =')) {
      captionPatch = captionPatch.replace(
        /(\s*const label = language\.indexOf\('pt'\) === 0 \? 'Importar PowerPoint' : 'Import PowerPoint';\r?\n)/,
        "$1        const captionLabel = language.indexOf('pt') === 0 ? 'Importar' : 'Import';\n",
      );
    }
    captionPatch = captionPatch.replace(
      /(\s*)caption\.textContent = label;/,
      '$1button.title = label;\n$1caption.textContent = captionLabel;',
    );
    if (captionPatch === captionPatchSource) {
      throw new Error('OnlyOffice presentation import caption patch no longer applies');
    }
    patched = patched.slice(0, captionPatchStart) + captionPatch;
  }

  if (!captionPatchSource.includes("const captionLabel = 'Import PPTX';")) {
    patched = patched.replace(
      "const captionLabel = language.indexOf('pt') === 0 ? 'Importar' : 'Import';",
      "const captionLabel = 'Import PPTX';",
    );
  }

  if (patched.includes(presentationImportFileMenuMarker)) {
    if (patched.includes(presentationImportFileMenuRuntimeMarker)) {
      return patched;
    }
    if (!patched.includes(legacyPresentationImportFileMenuSuffix)) {
      throw new Error('OnlyOffice presentation file-menu import runtime no longer applies');
    }
    patched = patched.replace(legacyPresentationImportFileMenuSuffix, presentationImportFileMenuRuntime);
  } else {
    patched += presentationImportFileMenuRuntime;
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
    for (const [sourcePath, patchSource] of [
      ['/cryptpad/www/common/outer/x2t.js', patchX2TLogging],
      ['/cryptpad/www/common/sframe-common-integration.js', patchIntegrationLogging],
      [
        '/cryptpad/www/common/sframe-common-outer.js',
        (source) => patchPersistentIntegrationSession(patchSframeOuterLogging(source)),
      ],
      ['/cryptpad/www/common/sframe-boot.js', patchSframeBootReply],
    ]) {
      patchSourceFile(sourcePath, patchSource);
    }
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
  patchIntegrationLogging,
  patchOnlyOfficeIntegration,
  patchPersistentIntegrationSession,
  patchPresentationImportToolbar,
  patchPresentationToolbarFile,
  patchPresentationToolbar,
  patchSframeOuterLogging,
  patchSframeBootReply,
  patchX2TLogging,
};
