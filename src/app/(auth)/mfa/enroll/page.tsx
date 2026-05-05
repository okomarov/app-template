import { redirect } from 'next/navigation'
import { getCurrentUserWithMfaStatus } from '@/app/actions/users'
import { EnrollForm } from './enroll-form'

export default async function MfaEnrollPage() {
  const status = await getCurrentUserWithMfaStatus()
  if (status?.mfaEnrolled) redirect('/')
  return <EnrollForm />
}
