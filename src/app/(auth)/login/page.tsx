import { requireAnonymous } from '@/lib/auth/require-auth'
import { LoginForm } from './login-form'

interface LoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>
}

const ERROR_MESSAGES: Record<string, string> = {
  verification_failed:
    'Your verification link is invalid or has expired. Please request a new one.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await requireAnonymous()
  const params = await searchParams
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error
  const initialError = errorCode ? (ERROR_MESSAGES[errorCode] ?? null) : null
  return <LoginForm initialError={initialError} />
}
