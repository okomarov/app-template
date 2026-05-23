import { requireAnonymous } from '@/lib/auth/require-auth'
import { SignupForm } from './signup-form'

interface SignupPageProps {
  searchParams: Promise<{
    email?: string | string[]
  }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  await requireAnonymous()
  const params = await searchParams
  const email = Array.isArray(params.email) ? params.email[0] : params.email
  return <SignupForm initialEmail={email ?? ''} />
}
