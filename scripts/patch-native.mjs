#!/usr/bin/env node
/**
 * patch-native.mjs: applies the store app's native pieces to the Capacitor projects. Safe to run again and again.
 *
 *   node scripts/patch-native.mjs [android|ios|all] [--icons]
 *
 * android: MainActivity (edge to edge, app plugins), StoreShellPlugin (adds native.js), NativeSSO (Sign in with Google),
 *          store.gradle (version, upload key, sign-in libraries), the app's own address for Apple sign-in coming back
 *          (<app id>://sso), app ID and name of this build (store or test).
 * ios:     MainViewController and AppPlugins (adds native.js, app plugins), NativeSSO and App.entitlements (Sign in with Apple
 *          and Google; webcredentials associated domains for passkeys), PrivacyInfo.xcprivacy, Info.plist keys (camera and photo wording, encryption answer, arm64),
 *          SceneDelegate and Main.storyboard use MainViewController.
 * --icons: remakes launcher icons and splash screens from assets/icon-1024.png (needs ImageMagick; run on the Dell).
 *
 * Run configure.mjs first: it decides the app ID and name.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NATIVE = path.join(ROOT, 'native');
const app = JSON.parse(readFileSync(path.join(ROOT, 'store-app.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
const args = process.argv.slice(2);
const which = args.find(a => !a.startsWith('--')) || 'all';
const icons = args.includes('--icons');
const read = f => readFileSync(f, 'utf8');
const write = (f, s) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, s); };
const fail = m => { console.error(`patch-native: ${m}`); process.exit(1); };
const say = m => console.log(`patch-native: ${m}`);

// ------------------------------------------------------------------ Android
function android() {
  const A = path.join(ROOT, 'android');
  if (!existsSync(A)) return say('no android/ (run cap add android first)');
  const pkg = app.appId;                                   // Java package and namespace stay the store ID in every build
  const javaDir = path.join(A, 'app/src/main/java', ...pkg.split('.'));
  for (const f of ['MainActivity.java', 'StoreShellPlugin.java', 'AppPlugins.java']) {
    const src = read(path.join(NATIVE, 'android', f)).replaceAll('__PACKAGE__', pkg);
    const dest = path.join(javaDir, f);
    if (f === 'AppPlugins.java' && existsSync(dest)) continue;   // the app may have added its own plugins here
    write(dest, src);
  }
  write(path.join(javaDir, 'sso', 'NativeSSOPlugin.java'), read(path.join(NATIVE, 'android', 'sso', 'NativeSSOPlugin.java')).replaceAll('__PACKAGE__', pkg));
  const plugins = path.join(javaDir, 'AppPlugins.java');
  let ap = read(plugins);
  const ssoJava = /^\s*activity\.registerPluginClass\([\w.]*NativeSSOPlugin\.class\);/m;
  if (!ssoJava.test(ap)) {
    ap = ap.replace(/(\n\s*activity\.registerPluginClass\(StoreShellPlugin\.class\);)/, `$1\n        activity.registerPluginClass(${pkg}.sso.NativeSSOPlugin.class);`);
    if (!ssoJava.test(ap)) fail('AppPlugins.java: could not add NativeSSOPlugin');
    write(plugins, ap);
  }
  // Apple sign-in comes back from the Custom Tab on <app id>://sso (sso.html sends it to this package only)
  const manifestFile = path.join(A, 'app/src/main/AndroidManifest.xml');
  let mf = read(manifestFile);
  if (!mf.includes('android:host="sso"')) {
    mf = mf.replace(/(<category android:name="android.intent.category.LAUNCHER" \/>\s*<\/intent-filter>)/,
      `$1\n\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="@string/custom_url_scheme" android:host="sso" />\n            </intent-filter>`);
    if (!mf.includes('android:host="sso"')) fail('AndroidManifest.xml: could not add the sign-in return address');
    write(manifestFile, mf);
  }
  copyFileSync(path.join(NATIVE, 'android', 'store.gradle'), path.join(A, 'app', 'store.gradle'));
  const gradleFile = path.join(A, 'app', 'build.gradle');
  let g = read(gradleFile);
  g = g.replace(/applicationId\s+"[^"]*"/, `applicationId "${cfg.appId}"`);
  if (!g.includes("apply from: 'store.gradle'")) g = g.trimEnd() + "\n\napply from: 'store.gradle'\n";
  write(gradleFile, g);
  const stringsFile = path.join(A, 'app/src/main/res/values/strings.xml');
  let s = read(stringsFile);
  const esc = v => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'");
  s = s.replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${esc(cfg.appName)}$2`)
       .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${esc(cfg.appName)}$2`)
       .replace(/(<string name="package_name">)[^<]*(<\/string>)/, `$1${cfg.appId}$2`)
       .replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${cfg.appId}$2`);
  write(stringsFile, s);
  // The launch theme shows the brand colour behind the splash
  const colors = path.join(A, 'app/src/main/res/values/store_colors.xml');
  write(colors, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="store_background">${app.background}</color>\n</resources>\n`);
  const styles = path.join(A, 'app/src/main/res/values/styles.xml');
  let st = read(styles);
  if (!st.includes('windowSplashScreenBackground')) {
    st = st.replace(/(<style name="AppTheme.NoActionBarLaunch"[^>]*>)/, `$1\n        <item name="windowSplashScreenBackground">@color/store_background</item>`);
    write(styles, st);
  }
  if (icons) androidIcons(A);
  say(`android: ${cfg.appId} "${cfg.appName}"`);
}

function magick(...a) { execFileSync('convert', a, { stdio: 'inherit' }); }

function androidIcons(A) {
  const icon = path.join(ROOT, 'assets', 'icon-1024.png');
  if (!existsSync(icon)) fail('assets/icon-1024.png is missing');
  const res = path.join(A, 'app/src/main/res');
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(res, `mipmap-${d}`);
    mkdirSync(dir, { recursive: true });
    const legacy = Math.round(48 * k), fg = Math.round(108 * k), inner = Math.round(72 * k);
    // full-bleed art: a rounded square for old launchers, a circle for round ones
    magick(icon, '-resize', `${legacy}x${legacy}`, '(', '+clone', '-alpha', 'extract', '-fill', 'black', '-colorize', '100',
      '-fill', 'white', '-draw', `roundrectangle 0,0,${legacy - 1},${legacy - 1},${Math.round(legacy * 0.18)},${Math.round(legacy * 0.18)}`, ')',
      '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', path.join(dir, 'ic_launcher.png'));
    magick(icon, '-resize', `${legacy}x${legacy}`, '(', '+clone', '-alpha', 'extract', '-fill', 'black', '-colorize', '100',
      '-fill', 'white', '-draw', `circle ${legacy / 2},${legacy / 2} ${legacy / 2},0`, ')',
      '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', path.join(dir, 'ic_launcher_round.png'));
    // adaptive icon: the art sits inside the 72dp safe zone on the brand colour, so no mask shape ever crops the mark
    magick('-size', `${fg}x${fg}`, 'xc:none', '(', icon, '-resize', `${inner}x${inner}`, ')', '-gravity', 'center', '-composite',
      path.join(dir, 'ic_launcher_foreground.png'));
  }
  write(path.join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${app.background}</color>\n</resources>\n`);
  for (const f of readdirSync(res)) {
    if (!/^drawable/.test(f)) continue;
    const sp = path.join(res, f, 'splash.png');
    if (!existsSync(sp)) continue;
    const size = execFileSync('identify', ['-format', '%wx%h', sp]).toString().trim();
    const [w, h] = size.split('x').map(Number);
    const mark = Math.round(Math.min(w, h) * 0.28);
    splash(icon, w, h, mark, sp);
  }
  say('android: icons and splash made');
}

function splash(icon, w, h, mark, out) {
  const r = Math.round(mark * 0.2237);
  magick('-size', `${w}x${h}`, `xc:${app.background}`,
    '(', icon, '-resize', `${mark}x${mark}`, '(', '+clone', '-alpha', 'extract', '-fill', 'black', '-colorize', '100',
    '-fill', 'white', '-draw', `roundrectangle 0,0,${mark - 1},${mark - 1},${r},${r}`, ')',
    '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')',
    '-gravity', 'center', '-compose', 'over', '-composite', '-alpha', 'off', out);
}

// ------------------------------------------------------------------ iOS
const pbxId = seed => crypto.createHash('sha1').update('store-app:' + seed).digest('hex').slice(0, 24).toUpperCase();

function addToPbx(pbx, file, type, phase) {
  if (pbx.includes(`/* ${file} */`)) return pbx;
  const ref = pbxId('ref:' + file), build = pbxId('build:' + file);
  const anchorRef = /(\t\t504EC3071FED79650016851F \/\* AppDelegate\.swift \*\/ = \{isa = PBXFileReference;[^\n]*\n)/;
  const anchorBuild = /(\t\t504EC3081FED79650016851F \/\* AppDelegate\.swift in Sources \*\/ = \{isa = PBXBuildFile;[^\n]*\n)/;
  const anchorGroup = /(\t\t\t\t504EC3071FED79650016851F \/\* AppDelegate\.swift \*\/,\n)/;
  if (!anchorRef.test(pbx) || !anchorBuild.test(pbx) || !anchorGroup.test(pbx)) fail('project.pbxproj does not look like the Capacitor template; add the files in Xcode');
  pbx = pbx.replace(anchorRef, `$1\t\t${ref} /* ${file} */ = {isa = PBXFileReference; lastKnownFileType = ${type}; path = ${file}; sourceTree = "<group>"; };\n`);
  pbx = pbx.replace(anchorBuild, `$1\t\t${build} /* ${file} in ${phase} */ = {isa = PBXBuildFile; fileRef = ${ref} /* ${file} */; };\n`);
  pbx = pbx.replace(anchorGroup, `$1\t\t\t\t${ref} /* ${file} */,\n`);
  const phaseRe = phase === 'Sources'
    ? /(\/\* Sources \*\/ = \{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = \d+;\n\t\t\tfiles = \(\n)/
    : /(\/\* Resources \*\/ = \{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = \d+;\n\t\t\tfiles = \(\n)/;
  if (!phaseRe.test(pbx)) fail(`no ${phase} build phase found in project.pbxproj`);
  return pbx.replace(phaseRe, `$1\t\t\t\t${build} /* ${file} in ${phase} */,\n`);
}

function plistSet(xml, key, valueXml) {
  const re = new RegExp(`\\s*<key>${key}</key>\\s*(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)`);
  const entry = `\n\t<key>${key}</key>\n\t${valueXml}`;
  if (re.test(xml)) return xml.replace(re, entry);
  return xml.replace(/<\/dict>\s*<\/plist>\s*$/, `${entry}\n</dict>\n</plist>\n`);
}
const xmlEsc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ios() {
  const I = path.join(ROOT, 'ios/App');
  if (!existsSync(I)) return say('no ios/ (run cap add ios first)');
  const appDir = path.join(I, 'App');
  for (const f of ['MainViewController.swift', 'AppPlugins.swift', 'PrivacyInfo.xcprivacy', 'NativeSSOPlugin.swift', 'App.entitlements']) {
    const dest = path.join(appDir, f);
    if (f === 'AppPlugins.swift' && existsSync(dest)) continue;
    copyFileSync(path.join(NATIVE, 'ios', f), dest);
  }
  const pluginsFile = path.join(appDir, 'AppPlugins.swift');
  let ap = read(pluginsFile);
  const ssoSwift = /^\s*bridge\.registerPluginInstance\(NativeSSOPlugin\(\)\)/m;
  if (!ssoSwift.test(ap)) {
    ap = ap.replace(/(guard let bridge = bridge else \{ return \}\n)(\s*_ = bridge\n)?/, '$1        bridge.registerPluginInstance(NativeSSOPlugin())\n');
    if (!ssoSwift.test(ap)) fail('AppPlugins.swift: could not add NativeSSOPlugin');
    write(pluginsFile, ap);
  }
  const pbxFile = path.join(I, 'App.xcodeproj/project.pbxproj');
  let pbx = read(pbxFile);
  pbx = addToPbx(pbx, 'MainViewController.swift', 'sourcecode.swift', 'Sources');
  pbx = addToPbx(pbx, 'AppPlugins.swift', 'sourcecode.swift', 'Sources');
  pbx = addToPbx(pbx, 'PrivacyInfo.xcprivacy', 'text.xml', 'Resources');
  pbx = addToPbx(pbx, 'NativeSSOPlugin.swift', 'sourcecode.swift', 'Sources');
  // Sign in with Apple: the App target signs with App.entitlements (the bundle ID has the capability at Apple)
  if (!pbx.includes('CODE_SIGN_ENTITLEMENTS')) pbx = pbx.replace(/(\n(\t+)PRODUCT_BUNDLE_IDENTIFIER = )/g, '\n$2CODE_SIGN_ENTITLEMENTS = App/App.entitlements;$1');
  if (!pbx.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')) fail('project.pbxproj: could not set CODE_SIGN_ENTITLEMENTS');
  pbx = pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${app.appId};`);
  pbx = pbx.replace(/IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g, 'IPHONEOS_DEPLOYMENT_TARGET = 16.0;');
  write(pbxFile, pbx);

  const sceneFile = path.join(appDir, 'SceneDelegate.swift');
  if (existsSync(sceneFile)) write(sceneFile, read(sceneFile).replace('rootViewController = CAPBridgeViewController()', 'rootViewController = MainViewController()'));
  const sb = path.join(appDir, 'Base.lproj/Main.storyboard');
  write(sb, read(sb).replace(/customClass="CAPBridgeViewController" customModule="Capacitor"/, 'customClass="MainViewController" customModule="App" customModuleProvider="target"'));

  const plistFile = path.join(appDir, 'Info.plist');
  let pl = read(plistFile);
  const p = app.permissions || {};
  pl = plistSet(pl, 'CFBundleDisplayName', `<string>${xmlEsc(app.appName)}</string>`);
  pl = plistSet(pl, 'ITSAppUsesNonExemptEncryption', '<false/>');
  pl = plistSet(pl, 'UIRequiredDeviceCapabilities', '<array>\n\t\t<string>arm64</string>\n\t</array>');
  pl = plistSet(pl, 'NSCameraUsageDescription', `<string>${xmlEsc(p.camera || `${app.appName} uses the camera when you choose to take a photo for your work.`)}</string>`);
  pl = plistSet(pl, 'NSPhotoLibraryUsageDescription', `<string>${xmlEsc(p.photos || `${app.appName} opens your photos when you choose one to add.`)}</string>`);
  pl = plistSet(pl, 'NSPhotoLibraryAddUsageDescription', `<string>${xmlEsc(p.photosAdd || `${app.appName} saves images you export to your photo library when you ask it to.`)}</string>`);
  if (p.microphone) pl = plistSet(pl, 'NSMicrophoneUsageDescription', `<string>${xmlEsc(p.microphone)}</string>`);
  if (app.appBoundDomains) {
    const hosts = (cfg.server.allowNavigation || []).map(h => `\t\t<string>${xmlEsc(h)}</string>`).join('\n');
    pl = plistSet(pl, 'WKAppBoundDomains', `<array>\n${hosts}\n\t</array>`);
  }
  else pl = pl.replace(/\s*<key>WKAppBoundDomains<\/key>\s*<array>[\s\S]*?<\/array>/, '');
  pl = plistSet(pl, 'UIStatusBarStyle', `<string>${app.barText === 'light' ? 'UIStatusBarStyleLightContent' : 'UIStatusBarStyleDarkContent'}</string>`);
  write(plistFile, pl);
  if (icons) iosIcons(appDir);
  say(`ios: ${app.appId} "${app.appName}"`);
}

function iosIcons(appDir) {
  const icon = path.join(ROOT, 'assets', 'icon-1024.png');
  if (!existsSync(icon)) fail('assets/icon-1024.png is missing');
  const set = path.join(appDir, 'Assets.xcassets/AppIcon.appiconset');
  magick(icon, '-resize', '1024x1024!', '-background', app.background, '-alpha', 'remove', '-alpha', 'off', path.join(set, 'AppIcon-512@2x.png'));
  const sp = path.join(appDir, 'Assets.xcassets/Splash.imageset');
  for (const f of readdirSync(sp)) if (f.endsWith('.png')) splash(icon, 2732, 2732, 560, path.join(sp, f));
  say('ios: icon and splash made');
}

if (which === 'android' || which === 'all') android();
if (which === 'ios' || which === 'all') ios();
