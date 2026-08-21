/**
 * Wires the existing EAS upload keystore into the local Gradle release config.
 * android/ is gitignored. Never prints passwords.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const creds = JSON.parse(fs.readFileSync(path.join(ROOT, 'credentials.json'), 'utf8'))
const ks = creds.android.keystore
const src = path.resolve(ROOT, ks.keystorePath)
const dest = path.join(ROOT, 'android', 'app', 'upload-keystore.jks')
fs.copyFileSync(src, dest)

const propsPath = path.join(ROOT, 'android', 'keystore.properties')
const props = [
  `storeFile=upload-keystore.jks`,
  `storePassword=${ks.keystorePassword}`,
  `keyAlias=${ks.keyAlias}`,
  `keyPassword=${ks.keyPassword || ks.keystorePassword}`,
].join('\n')
fs.writeFileSync(propsPath, props + '\n')

const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle')
let gradle = fs.readFileSync(gradlePath, 'utf8')
if (!gradle.includes('keystore.properties')) {
  gradle = gradle.replace(
    'android {\n',
    `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {\n`
  )
  gradle = gradle.replace(
    `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
    `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }`
  )
  gradle = gradle.replace(
    '            signingConfig signingConfigs.debug\n            def enableShrinkResources',
    '            signingConfig signingConfigs.release\n            def enableShrinkResources'
  )
  fs.writeFileSync(gradlePath, gradle)
}

if (!gradle.includes("signingConfig signingConfigs.release")) {
  console.error('Failed to switch release signingConfig to the upload keystore.')
  process.exit(1)
}
console.log('Release signing configured with existing upload keystore copy in android/app/upload-keystore.jks')
