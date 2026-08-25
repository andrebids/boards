// SPDX-FileCopyrightText: 2023 XWiki CryptPad Team <contact@cryptpad.org> and contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Preserve CryptPad loading progress without displaying CryptPad branding.
define([
  '/customize/messages.js',
  '/customize/lucide.js',
  'less!/customize/src/less2/include/loading.less',
], function (Messages, Lucide) {
  var elem = document.createElement('div');
  elem.setAttribute('id', 'cp-loading');
  elem.innerHTML = `
<div></div>
<div class="cp-loading-container">
    <div class="cp-loading-progress" aria-hidden="true" role="presentation">
        <div class="cp-loading-progress-list"></div>
        <div class="cp-loading-progress-container"></div>
    </div>
    <div id="cp-loading-spinner-message"></div>
    <div class="cp-loading-spinner-container">
        <div class="cp-spinner-main"></div>
    </div>
    <p id="cp-loading-message"></p>
</div>
<div id="cp-loading-footer">
    <div id="cp-loading-status">
        <i data-lucide="lock" aria-hidden="true"></i>
        <span>${Messages.loading_encrypted}</span>
    </div>
</div>
`;

  var types = ['less', 'drive', 'migrate', 'sf', 'team', 'pad', 'end'];
  var built = false;
  var current;
  var progress;
  var isOffline = false;

  var makeList = function (data) {
    if (data.type === 'end') {
      return '';
    }

    current = types.indexOf(data.type);
    return `<span>${Messages[`loading_state_${current}`]}</span>`;
  };

  var makeBar = function (data) {
    var step = types.indexOf(data.type);
    var lastStep = types.length - 1;
    var percentage = Math.min(data.progress, 100);
    var width = percentage / lastStep + (100 * step) / lastStep;

    return `<div class="cp-loading-progress-bar"><div class="cp-loading-progress-bar-value" style="width:${width}%"></div></div>`;
  };

  var updateLoadingProgress = function (data) {
    if (!built || !data) {
      return;
    }

    var message = document.querySelector('#cp-loading-message');
    if (data.type === 'offline') {
      isOffline = true;
      if (message) {
        message.style.display = 'block';
        message.innerText = Messages.offlineError;
      }
      return;
    }

    if (isOffline && message) {
      isOffline = false;
      message.style.display = 'none';
    }

    var step = types.indexOf(data.type);
    if (step < current || (step === current && progress > data.progress)) {
      return;
    }
    progress = data.progress;

    var spinner = document.querySelector('.cp-loading-spinner-container');
    if (spinner) {
      spinner.style.display = 'none';
    }
    var list = document.querySelector('.cp-loading-progress-list');
    if (list) {
      list.innerHTML = makeList(data);
    }
    var bar = document.querySelector('.cp-loading-progress-container');
    if (bar) {
      bar.innerHTML = makeBar(data);
    }
    var status = document.querySelector('#cp-loading-status');
    if (status) {
      status.style.cssText = '';
    }
  };

  window.CryptPad_updateLoadingProgress = updateLoadingProgress;
  window.CryptPad_loadingError = function (error) {
    if (!built) {
      return;
    }

    var progressNode = document.querySelector('.cp-loading-progress');
    if (progressNode?.parentNode) {
      progressNode.parentNode.removeChild(progressNode);
    }
    var spinner = document.querySelector('.cp-loading-spinner-container');
    if (spinner) {
      spinner.style.display = 'none';
    }
    var message = document.querySelector('#cp-loading-message');
    if (message) {
      message.style.display = 'block';
      message.innerText = error === 'Script error.' ? Messages.error_unhelpfulScriptError : error;
    }
  };

  return function () {
    built = true;
    var interval = setInterval(function () {
      if (document.body) {
        clearInterval(interval);
        document.body.appendChild(elem);
        Lucide.createIcons();
      }
    }, 100);
  };
});
