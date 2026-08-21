/**
 * Downloads the EXISTING EAS Android upload keystore into gitignored local files.
 * Does not generate a new keystore. Prints fingerprints only — never passwords.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_SHA1 = '6A39B315C89C20FE22F4BA951F39D742AD7A5106'
const PROJECT = '@ludmil/zenda'
const APPLICATION_ID = 'com.rubianejoaquim.zenda'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'credentials', 'android')
const CREDENTIALS_JSON = path.join(ROOT, 'credentials.json')

const statePath = path.join(os.homedir(), '.expo', 'state.json')
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
const sessionSecret = state?.auth?.sessionSecret
if (!sessionSecret) {
  console.error('No Expo session. Run eas login first.')
  process.exit(1)
}

const query = `
  query {
    app {
      byFullName(fullName: "${PROJECT}") {
        androidAppCredentials(filter: { applicationIdentifier: "${APPLICATION_ID}" }) {
          androidAppBuildCredentialsList {
            isDefault
            name
            androidKeystore {
              keystore
              keystorePassword
              keyAlias
              keyPassword
              sha1CertificateFingerprint
              sha256CertificateFingerprint
            }
          }
        }
      }
    }
  }
`

const res = await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'expo-session': sessionSecret,
  },
  body: JSON.stringify({ query }),
})

const payload = await res.json()
if (payload.errors) {
  console.error('GraphQL errors:', payload.errors.map((e) => e.message).join('; '))
  process.exit(1)
}

const list =
  payload?.data?.app?.byFullName?.androidAppCredentials?.[0]?.androidAppBuildCredentialsList || []
const chosen =
  list.find((c) => c.name?.includes('f8tLWzVQWO')) ||
  list.find((c) => c.isDefault) ||
  list[0]

if (!chosen?.androidKeystore?.keystore) {
  console.error('No existing Android keystore found on EAS.')
  process.exit(1)
}

const ks = chosen.androidKeystore
const sha1 = (ks.sha1CertificateFingerprint || '').toUpperCase().replace(/:/g, '')
console.log('Using EAS keystore:', chosen.name, chosen.isDefault ? '(default)' : '')
console.log('SHA-1:', sha1)
if (EXPECTED_SHA1 && sha1 && sha1 !== EXPECTED_SHA1) {
  console.error('SHA-1 does not match the known Play upload key. Aborting to avoid a new signing identity.')
  process.exit(1)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const keystoreRel = 'credentials/android/keystore.jks'
const keystoreAbs = path.join(ROOT, keystoreRel)
fs.writeFileSync(keystoreAbs, Buffer.from(ks.keystore, 'base64'))
fs.writeFileSync(
  CREDENTIALS_JSON,
  JSON.stringify(
    {
      android: {
        keystore: {
          keystorePath: keystoreRel,
          keystorePassword: ks.keystorePassword,
          keyAlias: ks.keyAlias,
          keyPassword: ks.keyPassword,
        },
      },
    },
    null,
    2
  )
)
console.log('Wrote gitignored', keystoreRel, 'and credentials.json')
console.log('keystore bytes:', fs.statSync(keystoreAbs).size)
