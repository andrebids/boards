/*
 * Copyright Ascensio System SIA 2010.
 *
 * Minimal ONLYOFFICE Plugin SDK runtime, adapted from the AGPL-3.0-only
 * sdkjs-plugins v1 implementation. It only contains the bridge required by
 * the Planka presentation-import plugin.
 */

(function (window) {
  const asc = (window.Asc = window.Asc || {});
  const plugin = (asc.plugin = {});
  const supportOrigins = {};

  const getQueryParameter = function (name) {
    const search = window.location.search;
    const prefix = `${name}=`;
    const start = search.indexOf(prefix);

    if (start < 0) {
      return undefined;
    }

    const valueStart = start + prefix.length;
    const valueEnd = search.indexOf('&', valueStart);
    return search.substring(valueStart, valueEnd < 0 ? search.length : valueEnd);
  };

  const getWindowId = function () {
    const windowId = getQueryParameter('windowID');

    if (windowId && !plugin.guid) {
      plugin.guid = decodeURIComponent(getQueryParameter('guid'));
    }

    if (windowId) {
      plugin.windowID = windowId;
    }

    return windowId;
  };

  const receiveEditorMessage = function (event) {
    if (window.plugin_onMessage) {
      if (supportOrigins[event.origin]) {
        window.plugin_onMessage(event);
      }
      return;
    }

    if (!plugin._initInternal || typeof event.data !== 'string') {
      return;
    }

    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (message.type === 'plugin_init') {
      supportOrigins[event.origin] = true;
      // ONLYOFFICE sends the remaining Plugin SDK methods through this trusted
      // initialization message.
      // eslint-disable-next-line no-eval
      eval(message.data);
    }
  };

  plugin.tr = function (value) {
    return value;
  };
  plugin._toolbarMenuEvents = {};
  plugin.attachToolbarMenuClickEvent = function (id, handler) {
    plugin._toolbarMenuEvents[id] = handler;
  };
  plugin.event_onToolbarMenuClick = function (id) {
    plugin._toolbarMenuEvents[id]?.();
  };
  window.Asc.scope = {};
  supportOrigins[window.origin] = true;
  window.addEventListener('message', receiveEditorMessage);

  window.addEventListener('load', function () {
    const request = new XMLHttpRequest();
    request.open('get', './config.json', true);
    request.responseType = 'json';

    request.onload = function () {
      if (request.status !== 200 && request.status !== 0) {
        return;
      }

      const config =
        typeof request.response === 'string' ? JSON.parse(request.response) : request.response;
      Object.assign(plugin, config);

      const message = { type: 'initialize', guid: plugin.guid };
      if (getWindowId()) {
        message.windowID = plugin.windowID;
      }

      plugin._initInternal = true;
      window.parent.postMessage(JSON.stringify(message), '*');
    };

    request.send();
  });
})(window);
