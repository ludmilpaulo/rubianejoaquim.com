import { NextResponse } from 'next/server'
import { ZENDA_APPLE_TEAM_ID, ZENDA_BUNDLE_ID } from '@/lib/zenda-stores'

const APP_ID = `${ZENDA_APPLE_TEAM_ID}.${ZENDA_BUNDLE_ID}`

const association = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: APP_ID,
        appIDs: [APP_ID],
        paths: ['/download*', '/invite/*', '/family/join*', '/zenda*', '/course/*', '/cursos/*', '/personal/*', '/goal/*'],
        components: [
          { '/': '/download*' },
          { '/': '/invite/*' },
          { '/': '/family/join*' },
          { '/': '/zenda*' },
          { '/': '/course/*' },
          { '/': '/cursos/*' },
          { '/': '/personal/*' },
          { '/': '/goal/*' },
        ],
      },
    ],
  },
}

export function GET() {
  return NextResponse.json(association, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
