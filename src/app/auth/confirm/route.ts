import type { EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { safeReturnTo } from '@/lib/auth/safe-return-to'
import { createClient } from '@/lib/supabase/server'

// Shared endpoint for the email-OTP flows this app uses. Each template
// hardcodes `&next=<path>` so the destination is template-controlled;
// safeReturnTo guards against `next` being an open-redirect.
// https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>(['signup', 'recovery'])

function isAllowedOtpType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_OTP_TYPES.has(value as EmailOtpType)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeReturnTo(searchParams.get('next'), '/')

  if (tokenHash && isAllowedOtpType(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin))
    }

    // Token already consumed (double-click on the email link is common: mail
    // clients pre-fetch, users double-tap on mobile). If the user already has
    // a session, the first click succeeded — send them to `next` instead of
    // bouncing back to /login with a confusing error.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin))
    }
  }

  const failUrl = new URL('/login', request.nextUrl.origin)
  failUrl.searchParams.set('error', 'verification_failed')
  return NextResponse.redirect(failUrl)
}
