import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/users'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect('/')
  return <LoginForm />
}
