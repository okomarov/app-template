'use client'

import { useRouter } from 'next/navigation'
import { MfaEnrollment } from '@/components/common/mfa-enrollment'

export function EnrollForm() {
  const router = useRouter()
  return <MfaEnrollment onEnrollmentSuccess={() => router.push('/mfa')} />
}
