/*
 * native.js: what the store app adds to the hosted web app. The native side injects this file at document start into the
 * app's own pages only (iOS: MainViewController, Android: MainActivity). It changes nothing in the browser.
 *
 *   - Marks the page: <html data-native="ios|android">, so the web app can hide web-only things (prices, install prompts).
 *   - Share: navigator.share opens the native share sheet (Android's WebView has none), including files.
 *   - Downloads: a generated file (PDF, CSV, image, label) opens the share sheet, where "Save to Files" keeps it.
 *   - Haptics: a light tap on buttons, a selection tick on switches and pickers.
 *   - Links to other sites open in an in-app browser sheet; mail, phone and maps links go to their apps.
 *   - Connection: a quiet banner while offline. Android's back button walks the page history.
 */
(function () {
  'use strict';
  if (window.__storeNative) return;
  // Only the native app injects this file, so it may run before Capacitor's own bridge script: look Capacitor up lazily.
  // only on the app's own pages (the native side also limits injection to them)
  var appHosts = (window.__storeHosts || []).map(function (h) { return String(h).toLowerCase(); });
  if (appHosts.length && appHosts.indexOf(location.hostname.toLowerCase()) < 0) return;
  window.__storeNative = true;
  var platform = /android/i.test(navigator.userAgent) ? 'android' : 'ios';

  function call(plugin, method, opts) {
    var Cap = window.Capacitor;
    try {
      if (!Cap) return Promise.reject(new Error('Capacitor is not ready'));
      var p = Cap.Plugins && Cap.Plugins[plugin];
      if (p && typeof p[method] === 'function') return Promise.resolve(p[method](opts || {}));
      if (typeof Cap.nativePromise === 'function') return Cap.nativePromise(plugin, method, opts || {});
    } catch (e) { return Promise.reject(e); }
    return Promise.reject(new Error(plugin + '.' + method + ' is not available'));
  }

  // ---- mark the page
  function mark() {
    var html = document.documentElement;
    if (html) { html.setAttribute('data-native', platform); html.classList.add('native-app'); }
  }
  mark();
  document.addEventListener('DOMContentLoaded', mark);

  // ---- haptics
  var lastTap = 0;
  function tap(kind) {
    var now = Date.now();
    if (now - lastTap < 60) return;
    lastTap = now;
    if (kind === 'select') call('Haptics', 'selectionChanged').catch(function () {});
    else call('Haptics', 'impact', { style: 'LIGHT' }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('button, [role="button"], input[type="submit"], input[type="button"], summary');
    if (el && !el.disabled && el.getAttribute('aria-disabled') !== 'true') tap('impact');
  }, true);
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && (t.type === 'checkbox' || t.type === 'radio' || t.tagName === 'SELECT' || t.getAttribute('role') === 'switch')) tap('select');
  }, true);

  // ---- files: write to the app's cache, then hand to the share sheet
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); resolve(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function safeName(name, type) {
    var n = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim().slice(0, 120);
    if (!n) n = 'file';
    if (!/\.[A-Za-z0-9]{1,6}$/.test(n)) {
      var ext = { 'application/pdf': 'pdf', 'text/csv': 'csv', 'image/png': 'png', 'image/jpeg': 'jpg', 'application/json': 'json',
        'text/plain': 'txt', 'application/zip': 'zip', 'text/calendar': 'ics', 'image/svg+xml': 'svg' }[type] || 'bin';
      n += '.' + ext;
    }
    return n;
  }
  function writeCache(blob, name) {
    var path = 'share/' + Date.now() + '-' + safeName(name, blob.type);
    return blobToBase64(blob).then(function (data) {
      return call('Filesystem', 'writeFile', { path: path, data: data, directory: 'CACHE', recursive: true });
    }).then(function (res) { return res.uri; });
  }
  function shareFiles(files, extra) {
    return Promise.all(files.map(function (f) { return writeCache(f, f.name); })).then(function (uris) {
      var opts = { files: uris };
      if (extra && extra.title) opts.title = extra.title;
      if (extra && extra.text) opts.text = extra.text;
      return call('Share', 'share', opts);
    });
  }
  function isCancel(err) { return /cancel/i.test(String(err && (err.message || err))); }

  // ---- navigator.share -> native share sheet
  var nativeShare = function (data) {
    data = data || {};
    var files = data.files && data.files.length ? Array.prototype.slice.call(data.files) : null;
    var p = files ? shareFiles(files, data) : call('Share', 'share', { title: data.title, text: data.text, url: data.url, dialogTitle: data.title });
    return p.then(function () {}).catch(function (err) {
      if (isCancel(err)) { var e = new Error('Share canceled'); e.name = 'AbortError'; throw e; }
      throw err;
    });
  };
  try {
    Object.defineProperty(navigator, 'share', { value: nativeShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: function () { return true; }, configurable: true });
  } catch (e) {}

  // ---- downloads (a[download], blob: and data: links, and window.open of a blob)
  function fetchBlob(href) { return fetch(href).then(function (r) { return r.blob(); }); }
  function handleDownload(href, name) {
    fetchBlob(href).then(function (blob) {
      var file;
      try { file = new File([blob], safeName(name, blob.type), { type: blob.type }); } catch (e) { file = blob; file.name = safeName(name, blob.type); }
      return shareFiles([file]);
    }).catch(function (err) { if (!isCancel(err)) console.warn('download failed', err); });
  }
  function downloadTarget(a) {
    if (!a || !a.href) return null;
    var href = a.href;
    var isLocal = /^(blob:|data:)/i.test(href);
    if (a.hasAttribute('download') && (isLocal || sameApp(href))) return { href: href, name: a.getAttribute('download') || nameFromUrl(href) };
    if (isLocal) return { href: href, name: nameFromUrl(href) };
    return null;
  }
  function nameFromUrl(u) { try { return decodeURIComponent(new URL(u).pathname.split('/').pop() || 'file'); } catch (e) { return 'file'; } }
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var d = downloadTarget(this);
    if (d) { handleDownload(d.href, d.name); return; }
    if (externalLink(this)) { openExternal(this.href); return; }
    return origClick.apply(this, arguments);
  };
  var origOpen = window.open;
  window.open = function (u) {
    var href = u ? String(u) : '';
    if (/^blob:/i.test(href)) { handleDownload(href, 'document'); return null; }
    if (href) {
      try {
        var abs = new URL(href, location.href);
        if (/^https?:$/.test(abs.protocol) && !sameApp(abs.href)) { openExternal(abs.href); return null; }
      } catch (e) {}
    }
    return origOpen.apply(window, arguments);
  };

  // ---- links to other sites: in-app browser sheet
  var hosts = appHosts.length ? appHosts : [location.hostname.toLowerCase()];
  function sameApp(href) {
    try { var u = new URL(href, location.href); return /^(blob|data):$/.test(u.protocol) || hosts.indexOf(u.hostname.toLowerCase()) >= 0; }
    catch (e) { return true; }
  }
  function externalLink(a) {
    try { var u = new URL(a.href, location.href); return /^https?:$/.test(u.protocol) && !sameApp(u.href); } catch (e) { return false; }
  }
  function openExternal(href) {
    call('Browser', 'open', { url: href, presentationStyle: 'popover' }).catch(function () { origOpen.call(window, href, '_blank'); });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var d = downloadTarget(a);
    if (d) { e.preventDefault(); handleDownload(d.href, d.name); return; }
    if (externalLink(a)) { e.preventDefault(); openExternal(a.href); }
  });

  // ---- connection banner
  var banner;
  function showOffline(off) {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'store-offline';   // the web app lifts it above its bottom bar on phones
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483647;' +
        'padding:10px 16px;border-radius:999px;background:rgba(20,20,22,.92);color:#fff;font:600 14px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:none;transition:opacity .25s;opacity:0;max-width:calc(100% - 32px);text-align:center';
      banner.textContent = window.__storeOfflineText || 'No connection. Some things may not load until you are back online.';
      document.body.appendChild(banner);
    }
    banner.style.opacity = off ? '1' : '0';
  }
  window.addEventListener('offline', function () { showOffline(true); });
  window.addEventListener('online', function () { showOffline(false); });
  document.addEventListener('DOMContentLoaded', function () { if (!navigator.onLine) showOffline(true); });

  // ---- Android back button walks the history, then leaves the app
  if (platform === 'android') {
    var backTries = 0;
    (function listenBack() {
      try {
        window.Capacitor.Plugins.App.addListener('backButton', function (ev) {
          if (ev && ev.canGoBack) history.back(); else call('App', 'minimizeApp').catch(function () {});
        });
      } catch (e) { if (backTries++ < 50) setTimeout(listenBack, 100); }
    })();
  }
})();
