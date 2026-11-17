#!/usr/bin/env node
/**
 * Runs after every `cap update` / `cap sync` (package.json "capacitor:update:after").
 *
 * Capacitor 7 writes the local plugin paths in ios/App/CapApp-SPM/Package.swift
 * with path.relative(), so on Windows they come out as "..\..\..\node_modules\@capacitor\app".
 * Backslashes are invalid escapes in a Swift string and break the iOS build on a
 * Mac or a cloud runner. This turns them into forward slashes; it is a no-op on
 * macOS and Linux and when the file is already clean.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platform = process.env.CAPACITOR_PLATFORM_NAME;
if (platform && platform !== 'ios') process.exit(0);

const root = process.env.CAPACITOR_ROOT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
if (!existsSync(file)) process.exit(0);

const before = await readFile(file, 'utf8');
let fixed = 0;
const after = before.replace(/(path:\s*")([^"]*)(")/g, (all, a, p, b) => {
  if (!p.includes('\\')) return all;
  fixed++;
  return a + p.replace(/\\/g, '/') + b;
});
if (fixed) {
  await writeFile(file, after);
  console.log(`[fix-ios-spm-paths] ${fixed} plugin path(s) in ios/App/CapApp-SPM/Package.swift now use forward slashes`);
}
