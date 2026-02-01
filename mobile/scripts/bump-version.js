#!/usr/bin/env node
/**
 * Bumps semantic version (e.g. 1.0.1 → 1.0.2) and build numbers in app.json and package.json.
 * Run before every EAS build so each build gets a new version.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

function parseVersion(v) {
  const parts = (v || '1.0.0').split('.').map(Number);
  return {
    major: parts[0] || 1,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpPatch(versionStr) {
  const v = parseVersion(versionStr);
  v.patch += 1;
  return formatVersion(v);
}

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

const currentVersion = app.expo?.version || pkg.version || '1.0.0';
const newVersion = bumpPatch(currentVersion);

// Update app.json
app.expo.version = newVersion;
if (!app.expo.android) app.expo.android = {};
const currentVersionCode = app.expo.android.versionCode ?? 1;
app.expo.android.versionCode = currentVersionCode + 1;
if (!app.expo.ios) app.expo.ios = {};
const currentBuildNumber = parseInt(app.expo.ios.buildNumber || '1', 10);
app.expo.ios.buildNumber = String(currentBuildNumber + 1);

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n', 'utf8');

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`Version bumped: ${currentVersion} → ${newVersion}`);
console.log(`Android versionCode: ${currentVersionCode} → ${currentVersionCode + 1}`);
console.log(`iOS buildNumber: ${currentBuildNumber} → ${currentBuildNumber + 1}`);
console.log('Commit app.json and package.json after building to keep versions in sync.');
