import { NextResponse } from 'next/server'
import { ZENDA_BUNDLE_ID } from '@/lib/zenda-stores'

/**
 * Android App Links. Add Play App Signing SHA-256 fingerprints via
 * ANDROID_APP_LINK_SHA256 (comma-separated) when available from Play Console.
 * Upload-keystore fingerprints can be appended the same way.
 */
function fingerprints(): string[] {
  const fromEnv = (process.env.ANDROID_APP_LINK_SHA256 || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(value))
  return fromEnv
}

export function GET() {
  const sha256 = fingerprints()
  const body = sha256.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: ZENDA_BUNDLE_ID,
            sha256_cert_fingerprints: sha256,
          },
        },
      ]
    : []

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
