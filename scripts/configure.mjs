#!/usr/bin/env node
/**
 * configure.mjs: writes capacitor.config.json and www/app-config.js for one build.
 *
 *   APP_CHANNEL=store node scripts/configure.mjs                 # store build: production URL from store-app.json
 *   APP_CHANNEL=store APP_URL=https://app.example.com/ node ...  # store build at another public address (a build setting)
 *   APP_CHANNEL=test  APP_URL=https://<test-host>/ node ...                  # test build (staging)
 *
 * Rules (the build fails loudly when one is broken):
 *   - A store build must load a public https address: never a tailnet name, a private or loopback address, or "staging".
 *   - APP_MODE=bundled (Tablescape only) runs the packaged www/ build instead of the hosted app: no server.url.
 *   - APP_MODE=local runs the local-first build (scripts/build-local.mjs, dist-local/): the whole app on the phone, signed web
 *     updates (src/live-update.js), saves on the device first. Pages open at the phone's own address (capacitor://localhost on
 *     the iPhone, https://localhost on Android), which the API already allows; links for other people use APP_URL's address.
 *   - A test build must never load the production address, and it gets its own app ID (".test") and name (" Test"),
 *     so it can sit next to the store app on one phone.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(readFileSync(path.join(ROOT, 'store-app.json'), 'utf8'));
const channel = process.env.APP_CHANNEL || 'store';
const fail = m => { console.error(`\nconfigure: ${m}\n`); process.exit(1); };
if (!['store', 'test'].includes(channel)) fail(`APP_CHANNEL must be store or test, not "${channel}"`);

const raw = process.env.APP_URL || (channel === 'store' ? app.prodUrl : '');
if (!raw) fail('a test build needs APP_URL (the staging address)');
let url;
try { url = new URL(raw); } catch { fail(`APP_URL is not a full address: ${raw}`); }
if (url.protocol !== 'https:') fail(`APP_URL must be https: ${raw}`);
const host = url.hostname;
const prodHost = new URL(app.prodUrl).hostname;
const privateHost = /(^localhost$)|(\.local$)|(\.ts\.net$)|(\.localhost$)|(^127\.)|(^10\.)|(^192\.168\.)|(^172\.(1[6-9]|2\d|3[01])\.)|(^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)|(^\[?::1\]?$)|staging|overseer/i;
if (channel === 'store' && privateHost.test(host)) fail(`a store build can't load a private or staging address (${host}); reviewers must reach it on the public internet`);
if (channel === 'test' && host === prodHost) fail(`a test build must never load production (${host})`);

const appId = channel === 'store' ? app.appId : `${app.appId}.test`;
const appName = channel === 'store' ? app.appName : `${app.appName} Test`;
const local = process.env.APP_MODE === 'local';
if (local && !existsSync(path.join(ROOT, 'dist-local', 'bundle.json'))) fail('APP_MODE=local needs dist-local/ first: node scripts/build-local.mjs');
// the hosts whose pages are the app's own (native.js runs there and only there); the local app's pages are on localhost
const nav = local ? ['localhost'] : [...new Set([host, ...(channel === 'store' ? app.allowNavigation || [] : [])])];

const config = {
  appId,
  appName,
  // The hosted build ships only the shell (offline page, icon, native script) from dist-www/; APP_MODE=bundled ships www/.
  webDir: local ? 'dist-local' : process.env.APP_MODE === 'bundled' ? 'www' : 'dist-www',
  backgroundColor: app.background,
  appendUserAgent: app.userAgentTag,
  loggingBehavior: 'none',
  server: {
    url: url.href,
    errorPath: 'offline.html',
    allowNavigation: nav,
    androidScheme: 'https',
    cleartext: false,
  },
  ios: {
    backgroundColor: app.background,
    contentInset: app.iosContentInset || 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    // App-Bound Domains turn on service workers in WKWebView (offline copies of pages); the hosts go in Info.plist WKAppBoundDomains.
    limitsNavigationsToAppBoundDomains: !!app.appBoundDomains && !local,   // the local app needs no service worker
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: app.background,
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: channel === 'test',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: app.background,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    // style DARK = light text for a dark app, LIGHT = dark text for a light app (Capacitor's naming)
    SystemBars: { insetsHandling: 'native', style: app.barText === 'light' ? 'DARK' : 'LIGHT' },
  },
};
if (process.env.APP_MODE === 'bundled' || local) { delete config.server.url; delete config.server.errorPath; }
// the local app navigates only within its own files; links to other addresses (the website too) open in the in-app browser sheet
if (local) config.server.allowNavigation = [];
writeFileSync(path.join(ROOT, 'capacitor.config.json'), JSON.stringify(config, null, 2) + '\n');

// What the shell bundles: www/ for APP_MODE=bundled, otherwise a fresh dist-www/ with only the shell's own files.
const OUT = path.join(ROOT, config.webDir);
if (config.webDir === 'dist-www') {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  copyFileSync(path.join(ROOT, 'www', 'offline.html'), path.join(OUT, 'offline.html'));
  copyFileSync(path.join(ROOT, 'www', 'offline.html'), path.join(OUT, 'index.html'));
  if (existsSync(path.join(ROOT, 'www', 'icon.png'))) copyFileSync(path.join(ROOT, 'www', 'icon.png'), path.join(OUT, 'icon.png'));
}
// native.js is injected by the native side into the app's own pages; this prelude tells it which hosts are the app's and
// what to say while offline (Stowline queues changes; the others don't).
const nativeSrc = readFileSync(path.join(ROOT, 'native', 'native.js'), 'utf8');
const offlineText = (app.offline && app.offline.banner) || 'No connection. Some things may not load until you are back online.';
writeFileSync(path.join(OUT, 'native.js'), `window.__storeHosts = ${JSON.stringify(nav)};
window.__storeOfflineText = ${JSON.stringify(offlineText)};
` + nativeSrc);
const pub = { name: app.appName, url: url.href, hosts: nav, background: app.background, foreground: app.foreground, accent: app.accent,
  channel, supportUrl: app.supportUrl, offline: app.offline || {} };
writeFileSync(path.join(OUT, 'app-config.js'), `window.STORE_APP = ${JSON.stringify(pub, null, 2)};
`);
console.log(local ? `configure: ${channel} build of ${appName} (${appId}), local-first: dist-local/ on the phone, links to ${url.origin}`
  : `configure: ${channel} build of ${appName} (${appId}) loading ${url.href}`);
