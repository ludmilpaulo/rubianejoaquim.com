import { NextRequest, NextResponse } from 'next/server'

/**
 * Safety net: if TikTok's portal is pointed at the website host instead of Django,
 * forward the OAuth callback (with query string) to the canonical API callback.
 * Canonical redirect URI remains:
 * https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/
 */
const DJANGO_CALLBACK =
  'https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/'

export async function GET(request: NextRequest) {
  const dest = new URL(DJANGO_CALLBACK)
  dest.search = request.nextUrl.search
  return NextResponse.redirect(dest, 302)
}
