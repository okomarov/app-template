import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/require-auth'
import { UnenrollForm } from './unenroll-form'

export default async function MfaUnenrollPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.mfaEnrolled) redirect('/')
  return <UnenrollForm />
}
