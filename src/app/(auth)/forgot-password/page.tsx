import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/users'
import { ForgotPasswordForm } from './forgot-password-form'

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')
  return <ForgotPasswordForm />
}
