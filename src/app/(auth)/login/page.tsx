import { requireAnonymous } from '@/lib/auth/require-auth'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  await requireAnonymous()
  return <LoginForm />
}
