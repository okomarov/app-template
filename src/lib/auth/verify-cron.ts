import { NextResponse } from 'next/server'
import { env } from '@/env'

export function verifyCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get('Authorization')

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
