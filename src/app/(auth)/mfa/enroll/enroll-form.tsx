'use client'

import { useRouter } from 'next/navigation'
import { MfaEnrollment } from '@/components/common/mfa-enrollment'
import { supabase } from '@/lib/supabase/client'

// Stash "user has been offered MFA" in auth.users.user_metadata so the login
// form can read it from the JWT without a server roundtrip (which would drag
// requireAuth's MFA-gate redirect into a mid-flow client await).
async function markMfaOffered(): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { mfa_offered_at: new Date().toISOString() },
  })
  if (error) throw new Error(error.message || 'Failed to save MFA preference.')
}

export function EnrollForm() {
  const router = useRouter()

  // On successful enrollment the user is already MFA-protected server-side,
  // so a failed mfa_offered_at write is non-fatal — log and go home.
  const onEnrolled = async () => {
    try {
      await markMfaOffered()
    } catch (err) {
      console.warn('[mfa.enroll] mfa_offered_at write failed (non-fatal)', err)
    }
    router.push('/')
  }

  // On Skip, persisting mfa_offered_at is the whole point — surface failures
  // so the user can retry instead of getting re-prompted next login.
  const onSkip = async () => {
    await markMfaOffered()
    router.push('/')
  }

  return <MfaEnrollment onEnrollmentSuccess={onEnrolled} onSkip={onSkip} />
}
