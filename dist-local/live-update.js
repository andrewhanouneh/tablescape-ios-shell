/* live-update.js 1.0 (shared/local-app, README.md there): new web versions for a local-first Capacitor app without a store release.
   No dependencies, nothing app-specific. It is the first script in every local build (bundle-tools.mjs insertBoot puts it at the top
   of <head>, after window.LOCAL_APP = {app, version, seq, built, updates:{url, publicKey}, ready}) and does nothing outside the native app.
   ready (optional, a function): true once the app's own code has run and drawn its first screen; without it, the page's load event.
   The app can also say so itself: LiveUpdate.started().

   The app always starts on the copy built into it. On that start this script decides whether to move to a downloaded version:
   - only one that was downloaded, checked file by file against a signed manifest and written completely;
   - never one that failed to start twice: a version has to say "started fine" (the app's code ran and drew its first screen)
     within 20 seconds of opening, and two starts without that put it on the "bad" list for good;
   - never one made for a newer app than this one (minNative), and never one older than the copy built in.
   It moves with Capacitor's own WebView.setServerBasePath and never makes that permanent, so the next start always begins on the
   built-in copy again, and an App Store update always starts on its own copy.

   Once the app has started fine, online and left alone for a few seconds, it checks the update address for a newer version:
   1. reads manifest.json: {payload: base64(JSON), sig: base64(ECDSA P-256 / SHA-256 signature of the payload bytes, r||s)}.
      The payload is {app, seq, version, minNative, use, files:[{path, sha256, size}]}. A bad signature is ignored.
      use: "builtin" is the kill switch: every phone goes back to its built-in copy on its next start.
   2. downloads the files that differ from the copy running now, copies the rest from it, checks every file's SHA-256, and only
      then names the folder as the version to open next time (a half-written download is never opened).
   Every signed manifest carries seq, the time it was made. The phone keeps the highest seq it ever accepted (hw, the high-water
   mark) and refuses any manifest at or below it, so an old manifest sent again (a replay) can never bring back an older version,
   and an old kill switch can never undo a newer update. A kill switch raises hw to its own seq and sets the staged version aside,
   so every version published before it is refused for good; the way forward is a new build.
   Downloads go through Capacitor's native HTTP, not the web view, so they work whatever address the app's pages have.
   State lives in localStorage ("local-app:update"), which every copy shares (same origin). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LiveUpdate = api.boot(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KEY = 'local-app:update', HOP = 'local-app:hop', NATIVE = 'local-app:native', MAX_TRIES = 2, MAX_UNCHECKED = 5, VNAME = /^(?!\.+$)[A-Za-z0-9._-]{1,64}$/, HEALTH_MS = 20000, IDLE_MS = 4000;
  const b64 = {
    from: s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; },
    to: u => { let s = ''; const n = 0x8000; for (let i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n)); return btoa(s); },
  };
  const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  /* "1.0.10" against "1.0.9": by number, part by part */
  function cmpVer(a, b) { const A = String(a || '0').split('.'), B = String(b || '0').split('.');
    for (let i = 0; i < Math.max(A.length, B.length); i++) { const x = parseInt(A[i] || '0', 10) || 0, y = parseInt(B[i] || '0', 10) || 0; if (x !== y) return x < y ? -1 : 1; } return 0; }
  const safePath = p => typeof p === 'string' && p.length > 0 && p.length < 300 && !/^[\\/]|\\|(^|\/)\.\.?(\/|$)|[\0:*?"<>|]/.test(p);

  /* env: {cap(plugin, method, opts) -> Promise, local: {get, set}, session: {get, set, del}, fetchLocal(path) -> Promise<Uint8Array>,
     subtle, platform, bundle: {version, seq}, config: {url, publicKey, appId}, nativeVersion, beforeMove(), now, timers, log}.
     nativeVersion: the app's own version as App.getInfo gave it on an earlier launch (kept in localStorage, so the decision to move is
     made at once, before this copy draws anything); while unknown, a version that names a minimum app version is never opened. */
  function create(env) {
    const L = env.log || (() => {}), now = env.now || (() => Date.now()), T = env.timers || { set: (f, ms) => setTimeout(f, ms), clear: t => clearTimeout(t) };
    const read = () => { try { return Object.assign({ bad: [] }, JSON.parse(env.local.get(KEY) || '{}')); } catch (e) { return { bad: [] }; } };
    const write = s => { try { env.local.set(KEY, JSON.stringify(s)); } catch (e) {} };
    const B = env.bundle || {}, C = env.config || {};
    const dir = env.platform === 'ios' ? 'LIBRARY_NO_CLOUD' : 'DATA', BASE = 'web-updates';

    /* ---- start: the built-in copy decides whether to move to a downloaded version. Everything before the move runs at once (no
       waiting), so this copy is stopped before it draws or runs its own code ---- */
    async function start() {
      const hop = env.session.get(HOP), s = read();
      if (hop) {
        if (hop === B.version) return { where: 'update', version: B.version };       // we are the downloaded version it moved to
        env.session.del(HOP);                                                          // the move didn't happen: still the built-in copy
        if (s.staged && s.staged.version === hop) { markBad(s, hop, 'did not open'); write(s); }
        return { where: 'builtin', version: B.version, reason: 'move failed' };
      }
      /* a new store build since the last launch: the download's folder may have moved (iOS) and the kept app version may be the old
         one, so the download waits until revalidate() has found it again with this build's version */
      if (s.staged && s.builtin && s.builtin.version && s.builtin.version !== B.version) s.staged.native = null;
      s.builtin = { version: B.version, seq: B.seq }; s.hw = Math.max(s.hw || 0, B.seq || 0);
      const st = s.staged;
      if (!st) { write(s); return { where: 'builtin', version: B.version }; }
      if (s.bad.includes(st.version) || !(st.seq > (B.seq || 0)) || (st.minNative && (!env.nativeVersion || cmpVer(env.nativeVersion, st.minNative) < 0))) {
        delete s.staged; write(s); return { where: 'builtin', version: B.version, reason: 'staged not usable' };
      }
      if ((st.tries || 0) >= MAX_TRIES) { markBad(s, st.version, 'never started fine'); write(s); return { where: 'builtin', version: B.version, reason: 'bad' }; }
      /* the app itself was updated since the download: its folder may have moved (iOS). Not this launch; revalidate() finds it again */
      if (!st.native || st.native !== env.nativeVersion) { write(s); return { where: 'builtin', version: B.version, reason: 'app updated, checking the download' }; }
      /* the download hasn't completed an update check in a while (a broken check could never be killed): one launch on the built-in
         copy, which checks */
      if ((st.unchecked || 0) >= MAX_UNCHECKED) { st.unchecked = 0; write(s); return { where: 'builtin', version: B.version, reason: 'time to check from the built-in copy' }; }
      st.tries = (st.tries || 0) + 1; st.unchecked = (st.unchecked || 0) + 1; write(s); env.session.set(HOP, st.version);
      /* this copy stops loading before the move is asked for: stopping after it could cancel the move's own navigation */
      if (env.beforeMove) try { env.beforeMove(st.version); } catch (e) {}
      try { await env.cap('WebView', 'setServerBasePath', { path: st.path }); }
      catch (e) { env.session.del(HOP); markBad(s, st.version, 'switch refused'); write(s); return { where: 'builtin', version: B.version, reason: 'switch refused' }; }
      return { where: 'moving', version: st.version };
    }
    function markBad(s, v, why) { if (!s.bad.includes(v)) s.bad.push(v); s.bad = s.bad.slice(-20); if (s.staged && s.staged.version === v) delete s.staged; L('live-update: ' + v + ' set aside (' + why + ')'); }

    /* ---- health: the copy running now started fine ---- */
    function healthy() { const s = read(); if (s.staged && s.staged.version === B.version) { s.staged.tries = 0; s.staged.ok = true; } s.running = B.version; write(s); }
    /* the staged download is still whole and where we think: its folder's address again (it can change when the app is updated), and
       index.html there. A missing folder is dropped, not set aside: the version itself was fine */
    async function revalidate() {
      const s = read(), st = s.staged; if (!st || !st.rel) return { result: 'nothing staged' };
      try { await env.cap('Filesystem', 'stat', { path: st.rel + '/index.html', directory: dir }); }
      catch (e) { const s2 = read(); if (s2.staged && s2.staged.version === st.version) { drop(s2); write(s2); } return { result: 'download gone' }; }
      const uri = (await env.cap('Filesystem', 'getUri', { path: st.rel, directory: dir })).uri, s3 = read();
      if (s3.staged && s3.staged.version === st.version) { s3.staged.path = fsPath(uri); s3.staged.native = env.nativeVersion || null; write(s3); }
      return { result: 'ok' };
    }
    /* the staged download is gone (not bad): it may be fetched again, exactly that version and seq */
    function drop(s) { if (s.staged) { s.dropped = { version: s.staged.version, seq: s.staged.seq }; delete s.staged; } }
    const fsPath = uri => decodeURIComponent(String(uri).replace(/^file:\/\//, '')).replace(/\/$/, '');

    /* ---- the update check ---- */
    async function verify(manifest) {
      if (!manifest || typeof manifest.payload !== 'string' || typeof manifest.sig !== 'string' || !C.publicKey) throw new Error('unsigned manifest');
      const key = await env.subtle.importKey('spki', b64.from(C.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const data = b64.from(manifest.payload);
      if (!(await env.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64.from(manifest.sig), data))) throw new Error('bad signature');
      const p = JSON.parse(new TextDecoder().decode(data));
      if (C.appId && p.app !== C.appId) throw new Error('manifest for another app');
      return p;
    }
    const sha = async u => hex(await env.subtle.digest('SHA-256', u));
    async function check() {
      if (!C.url) return { result: 'no update address' };
      const s = read(), res = await env.cap('CapacitorHttp', 'request', { url: C.url.replace(/\/?$/, '/') + 'manifest.json?t=' + now(), method: 'GET', responseType: 'text', headers: { 'Cache-Control': 'no-cache' } });
      if (!res || (res.status !== 200 && res.status !== 404)) return { result: 'no manifest', status: res && res.status };
      if (res.status === 404) { checked(); return { result: 'no manifest', status: 404 }; }
      const p = await verify(typeof res.data === 'string' ? JSON.parse(res.data) : res.data);
      checked();
      const newest = Math.max(B.seq || 0, s.hw || 0, (s.staged && s.staged.seq) || 0, (s.builtin && s.builtin.seq) || 0);
      /* a download dropped only because its folder went missing may be fetched again: exactly that version and seq, never older */
      const again = p.use !== 'builtin' && s.dropped && s.dropped.version === p.version && s.dropped.seq === p.seq && p.seq > Math.max(B.seq || 0, s.killHw || 0);
      if (!(typeof p.seq === 'number' && (p.seq > newest || again))) return { result: p.use === 'builtin' ? 'old kill switch' : 'up to date' };
      if (p.use === 'builtin') {
        s.hw = p.seq; s.killHw = p.seq; delete s.dropped; if (s.staged) markBad(s, s.staged.version, 'kill switch');
        (Array.isArray(p.kills) ? p.kills : []).forEach(v => { if (typeof v === 'string' && !s.bad.includes(v)) s.bad.push(v); });
        write(s); return { result: 'use builtin' };
      }
      if (s.bad.includes(p.version)) return { result: 'set aside before' };
      if (typeof p.version !== 'string' || !VNAME.test(p.version)) throw new Error('bad version name');
      if (p.minNative && (!env.nativeVersion || cmpVer(env.nativeVersion, p.minNative) < 0)) return { result: 'needs a newer app' };
      if (!Array.isArray(p.files) || !p.files.length || !p.files.some(f => f.path === 'index.html')) throw new Error('manifest has no index.html');
      p.files.forEach(f => { if (!safePath(f.path) || !/^[0-9a-f]{64}$/.test(f.sha256)) throw new Error('bad file entry ' + f.path); });
      const folder = await download(p);
      const s2 = read(), again2 = s2.dropped && s2.dropped.version === p.version && s2.dropped.seq === p.seq && p.seq > (s2.killHw || 0);
      if (!(p.seq > (s2.hw || 0) || again2) || s2.bad.includes(p.version)) return { result: 'overtaken while downloading' };
      delete s2.dropped; s2.staged = { version: p.version, seq: p.seq, rel: BASE + '/' + p.version, path: folder.path, native: env.nativeVersion || null, minNative: p.minNative || null, tries: 0 }; s2.hw = p.seq; write(s2);
      await tidy([p.version, B.version, s2.running]);
      return { result: 'staged', version: p.version, fetched: folder.fetched, copied: folder.copied };
    }
    async function download(p) {
      const tmp = BASE + '/.tmp-' + p.version, fin = BASE + '/' + p.version;
      await env.cap('Filesystem', 'rmdir', { path: tmp, directory: dir, recursive: true }).catch(() => {});
      let here = {}; try { here = Object.fromEntries((JSON.parse(new TextDecoder().decode(await env.fetchLocal('bundle.json'))).files || []).map(f => [f.path, f.sha256])); } catch (e) {}
      let fetched = 0, copied = 0;
      for (const f of p.files) {
        let bytes = null;
        if (here[f.path] === f.sha256) { try { bytes = await env.fetchLocal(f.path); copied++; } catch (e) { bytes = null; } }
        if (!bytes || (await sha(bytes)) !== f.sha256) {
          const r = await env.cap('CapacitorHttp', 'request', { url: C.url.replace(/\/?$/, '/') + 'files/' + f.path.split('/').map(encodeURIComponent).join('/'), method: 'GET', responseType: 'arraybuffer' });
          if (!r || r.status !== 200) throw new Error('download failed: ' + f.path);
          bytes = b64.from(r.data); fetched++;
          if ((await sha(bytes)) !== f.sha256) throw new Error('file does not match the manifest: ' + f.path);
        }
        await env.cap('Filesystem', 'writeFile', { path: tmp + '/' + f.path, data: b64.to(bytes), directory: dir, recursive: true });
      }
      await env.cap('Filesystem', 'writeFile', { path: tmp + '/bundle.json', data: b64.to(new TextEncoder().encode(JSON.stringify({ version: p.version, seq: p.seq, files: p.files }))), directory: dir, recursive: true });
      await env.cap('Filesystem', 'rmdir', { path: fin, directory: dir, recursive: true }).catch(() => {});
      await env.cap('Filesystem', 'rename', { from: tmp, to: fin, directory: dir, toDirectory: dir });
      const uri = (await env.cap('Filesystem', 'getUri', { path: fin, directory: dir })).uri;
      return { path: fsPath(uri), fetched, copied };
    }
    /* keep the version to open next, the one running and the built-in one's name; remove other downloads */
    async function tidy(keep) {
      let list = []; try { list = (await env.cap('Filesystem', 'readdir', { path: BASE, directory: dir })).files || []; } catch (e) { return; }
      for (const f of list) { const n = typeof f === 'string' ? f : f.name; if (n && !keep.includes(n)) await env.cap('Filesystem', 'rmdir', { path: BASE + '/' + n, directory: dir, recursive: true }).catch(() => {}); }
    }

    /* the page side: watch for "started fine", then check for updates once things are quiet */
    function watch(isReady, online) {
      const t0 = now(); let done = false;
      return new Promise(resolve => {
        const tick = () => { if (done) return;
          if (isReady()) { done = true; healthy(); resolve(true); return; }
          if (now() - t0 > HEALTH_MS) { done = true; resolve(false); return; }
          T.set(tick, 500); };
        tick();
      }).then(ok => { if (ok) revalidate().catch(() => {}).then(() => { if (online()) T.set(() => check().then(r => L('live-update: ' + JSON.stringify(r)), e => L('live-update: check failed: ' + (e && e.message))), IDLE_MS); }); return ok; });
    }
    /* a manifest was read (or there is none): the download that runs now can still be reached by a kill switch */
    function checked() { const s = read(); s.checkedAt = now(); if (s.staged && s.staged.version === B.version) s.staged.unchecked = 0; write(s); }
    /* no reload came after the move: a missing folder is dropped; a folder that is there but did not open is set aside */
    async function failedMove(v) {
      env.session.del(HOP); const s = read(), st = s.staged;
      let there = true, moved = null;
      if (st && st.version === v && st.rel) {
        try { await env.cap('Filesystem', 'stat', { path: st.rel + '/index.html', directory: dir }); } catch (e) { there = false; }
        /* the folder is there but at another address (the app's own folder moved): use the new address next time, not a bad mark */
        if (there) try { const p = fsPath((await env.cap('Filesystem', 'getUri', { path: st.rel, directory: dir })).uri); if (p !== st.path) moved = p; } catch (e) {}
      }
      const s2 = read();
      if (moved && s2.staged && s2.staged.version === v) s2.staged.path = moved;
      else if (there) markBad(s2, v, 'did not open');
      else if (s2.staged && s2.staged.version === v) drop(s2);
      write(s2);
    }
    return { start, healthy, check, verify, watch, failedMove, revalidate, state: read, _download: download };
  }

  /* in the app: the real Capacitor bridge, localStorage and sessionStorage */
  function boot(w) {
    const Cap = w.Capacitor, A = w.LOCAL_APP || {}, up = A.updates || {}, bundle = { version: A.version, seq: A.seq }, cfg = { url: up.url || '', publicKey: up.publicKey || '', appId: A.app || '' };
    const native = !!(Cap && (typeof Cap.isNativePlatform === 'function' ? Cap.isNativePlatform() : Cap.isNative));
    if (!native || !bundle.version) return { off: true, started: () => {}, check: () => Promise.resolve({ result: 'off' }), state: () => ({}) };
    const cap = (plugin, method, opts) => { const P = Cap.Plugins && Cap.Plugins[plugin];
      if (P && typeof P[method] === 'function') return Promise.resolve(P[method](opts || {}));
      return Cap.nativePromise(plugin, method, opts || {}); };
    const store = s => ({ get: k => s.getItem(k), set: (k, v) => s.setItem(k, v), del: k => s.removeItem(k) });
    const platform = typeof Cap.getPlatform === 'function' ? Cap.getPlatform() : (/android/i.test(navigator.userAgent) ? 'android' : 'ios');
    let live;
    /* this copy stops drawing, and the fallback is armed before the move is asked for: if no reload comes within 4 s (no answer, or
       a folder that did not open), the version is set aside (or dropped, or its new address kept) and this copy starts again */
    const beforeMove = v => { w.document.documentElement.style.visibility = 'hidden'; w.stop();
      w.setTimeout(() => { live.failedMove(v).catch(() => {}).then(() => w.location.reload()); }, 4000); };
    const make = nativeVersion => create({ cap, local: store(w.localStorage), session: store(w.sessionStorage), subtle: w.crypto && w.crypto.subtle, platform, bundle, config: cfg, nativeVersion, beforeMove,
      fetchLocal: p => fetch('/' + p, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => new Uint8Array(b)),
      log: m => { try { console.info(m); } catch (e) {} } });
    /* the decision is made at once, with the app's version as App.getInfo gave it on an earlier launch; this launch reads it again
       for next time (a launch that has never read it opens no version that names a minimum app version) */
    let kept = null; try { kept = w.localStorage.getItem(NATIVE); } catch (e) {}
    live = make(kept); let saidStarted = false;
    const api = { ready: null, check: () => live.check(), state: () => live.state(), started: () => { saidStarted = true; } };
    const version = cap('App', 'getInfo').then(info => { const v = info && info.version ? String(info.version) : null; if (v) { try { w.localStorage.setItem(NATIVE, v); } catch (e) {} } return v; }, () => null);
    api.ready = live.start().then(async r => {
      if (r.where === 'moving') return r;   // the web view reloads into the downloaded version; the fallback was armed in beforeMove
      /* the move was refused after this copy had stopped: start again (the version is set aside, so the built-in copy opens) */
      if (r.reason === 'switch refused') { w.location.reload(); return r; }
      const v = await version; if (v !== kept) live = make(v);
      const isReady = () => saidStarted || (w.document.readyState === 'complete' && (typeof A.ready !== 'function' || (function () { try { return !!A.ready(); } catch (e) { return false; } })()));
      live.watch(isReady, () => w.navigator.onLine !== false);
      return r;
    }).catch(e => ({ where: 'builtin', error: String(e && e.message) }));
    return api;
  }
  return { create, boot, cmpVer, safePath, b64 };
});
