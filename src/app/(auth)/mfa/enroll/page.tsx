'use client'

import { useRouter } from 'next/navigation'
import { MfaEnrollment } from '@/components/common/mfa-enrollment'

export default function MfaEnroll() {
  const router = useRouter()

  const handleEnrollmentSuccess = () => {
    router.push('/mfa')
  }

  return <MfaEnrollment onEnrollmentSuccess={handleEnrollmentSuccess} />
}
