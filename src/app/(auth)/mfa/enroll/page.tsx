import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/require-auth'
import { EnrollForm } from './enroll-form'

export default async function MfaEnrollPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.mfaEnrolled) redirect('/')
  return <EnrollForm />
}
