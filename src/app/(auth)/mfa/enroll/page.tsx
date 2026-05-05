import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/users'
import { EnrollForm } from './enroll-form'

export default async function MfaEnrollPage() {
  const user = await getCurrentUser()
  if (user?.mfaEnrolled) redirect('/')
  return <EnrollForm />
}
