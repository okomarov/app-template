import { requireAnonymous } from '@/lib/auth/require-auth'
import { ForgotPasswordForm } from './forgot-password-form'

export default async function ForgotPasswordPage() {
  await requireAnonymous()
  return <ForgotPasswordForm />
}
