// SPDX-FileCopyrightText: 2023 XWiki CryptPad Team <contact@cryptpad.org> and contributors
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Preserve the CryptPad loading state without displaying CryptPad branding.
(function () {
  var elem = document.createElement('div');
  elem.setAttribute('id', 'placeholder');
  elem.innerHTML = `
<div></div>
<div class="placeholder-message-container">
    <p>Loading...</p>
</div>
<div id="placeholder-loading-footer">
    <div id="placeholder-loading-status">
        <i data-lucide="lock" aria-hidden="true"></i>
        <span>End-to-end encrypted</span>
    </div>
</div>
`;

  var key = 'CRYPTPAD_STORE|colortheme';
  if (localStorage[key] && localStorage[key] === 'dark') {
    elem.classList.add('dark-theme');
  }
  if (!localStorage[key] && localStorage[`${key}_default`] === 'dark') {
    elem.classList.add('dark-theme');
  }

  var req;
  try {
    req = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
    if ((req.theme || req.themeOS) === 'dark') {
      elem.classList.add('dark-theme');
    }
  } catch (error) {
    // The loading screen is also used when the URL has no integration hash.
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(elem);
    window.CP_preloadingTime = +new Date();

    var message = document.querySelector('.placeholder-message-container');
    if (message && req && req.time && +new Date() - req.time > 2000) {
      message.style.opacity = 100;
      message.style.animation = 'none';
    }

    setTimeout(function () {
      if (message) {
        message.style.opacity = 100;
      }
    }, 3000);
  });
}());
