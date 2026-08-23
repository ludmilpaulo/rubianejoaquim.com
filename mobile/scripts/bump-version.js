#!/usr/bin/env node
/**
 * Bumps semantic version (e.g. 1.0.1 → 1.0.2) and build numbers.
 * Keeps app.json, package.json, and native Expo runtime versions in sync.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const APP_JSON = path.join(ROOT, 'app.json')
const PACKAGE_JSON = path.join(ROOT, 'package.json')
const EXPO_PLIST = path.join(ROOT, 'ios', 'Zenda', 'Supporting', 'Expo.plist')
const ANDROID_STRINGS = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml')
const ANDROID_GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle')

function parseVersion(v) {
  const parts = (v || '1.0.0').split('.').map(Number)
  return {
    major: parts[0] || 1,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  }
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

function bumpPatch(versionStr) {
  const v = parseVersion(versionStr)
  v.patch += 1
  return formatVersion(v)
}

function replaceFile(filePath, replacer) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip missing file: ${filePath}`)
    return
  }
  const before = fs.readFileSync(filePath, 'utf8')
  const after = replacer(before)
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8')
  }
}

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'))
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'))

const currentVersion = app.expo?.version || pkg.version || '1.0.0'
const newVersion = bumpPatch(currentVersion)

app.expo.version = newVersion
if (typeof app.expo.runtimeVersion === 'string' && !app.expo.runtimeVersion.includes('{')) {
  app.expo.runtimeVersion = newVersion
}
if (!app.expo.android) app.expo.android = {}
const currentVersionCode = app.expo.android.versionCode ?? 1
app.expo.android.versionCode = currentVersionCode + 1
if (!app.expo.ios) app.expo.ios = {}
const currentBuildNumber = parseInt(app.expo.ios.buildNumber || '1', 10)
app.expo.ios.buildNumber = String(currentBuildNumber + 1)

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n', 'utf8')

pkg.version = newVersion
fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

replaceFile(EXPO_PLIST, (text) =>
  text.replace(
    /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${newVersion}$2`,
  ),
)

replaceFile(ANDROID_STRINGS, (text) =>
  text.replace(
    /(<string name="expo_runtime_version">)[^<]+(<\/string>)/,
    `$1${newVersion}$2`,
  ),
)

replaceFile(ANDROID_GRADLE, (text) =>
  text
    .replace(/versionCode\s+\d+/, `versionCode ${app.expo.android.versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`),
)

console.log(`Version bumped: ${currentVersion} → ${newVersion}`)
console.log(`Android versionCode: ${currentVersionCode} → ${app.expo.android.versionCode}`)
console.log(`iOS buildNumber: ${currentBuildNumber} → ${app.expo.ios.buildNumber}`)
console.log('Synced Expo.plist + Android runtime/versionName. Rebuild native binaries before store submit.')
