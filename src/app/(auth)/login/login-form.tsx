'use client'

import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { normalizeAuthEmail } from '@/lib/auth/email'
import { supabase } from '@/lib/supabase/client'
import styles from './login.module.css'

function isEmailNotConfirmedError(error: { code?: string; message: string }): boolean {
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)
}

interface LoginFormProps {
  initialError?: string | null
}

export function LoginForm({ initialError = null }: LoginFormProps = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError ?? '')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const router = useRouter()

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setResendMessage('')
    setResendError('')
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: unverifiedEmail })
      if (error) {
        setResendError(error.message || 'Could not resend verification email.')
      } else {
        setResendMessage('Verification email sent.')
      }
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Could not resend verification email.')
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedEmail = normalizeAuthEmail(email)
    setError('')
    setUnverifiedEmail('')
    setResendMessage('')
    setResendError('')
    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (signInError) {
        if (isEmailNotConfirmedError(signInError)) {
          setUnverifiedEmail(normalizedEmail)
          setError('Your email is not verified yet. Check your inbox for the verification link.')
          return
        }
        throw signInError
      }

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find((f) => f.status === 'verified')
      if (totp) {
        router.push(`/mfa?factorId=${totp.id}`)
        return
      }
      // mfa_offered_at lives in user_metadata so we can read it from the JWT
      // without a server action that would invoke requireAuth's MFA-gate redirect.
      const hasBeenOfferedMfa = Boolean(data.user?.user_metadata?.mfa_offered_at)
      if (!hasBeenOfferedMfa) {
        router.push('/mfa/enroll')
        return
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="6"
        className={styles.authContent}
      >
        <Text size="6" weight="bold">
          App Name
        </Text>
        <Flex direction="column" gap="4" className={styles.loginForm}>
          <Text size="5" weight="bold" align="center">
            Login
          </Text>
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <TextField.Root
                size="3"
                type="email"
                name="username"
                autoComplete="username"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <TextField.Root
                size="3"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              >
                <TextField.Slot side="right">
                  <Button
                    variant="ghost"
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPassword(!showPassword)
                    }}
                    className={styles.passwordToggle}
                    disabled={isLoading}
                  >
                    {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                  </Button>
                </TextField.Slot>
              </TextField.Root>
              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}
              {unverifiedEmail && (
                <>
                  {resendMessage && (
                    <Text size="2" color="green">
                      {resendMessage}
                    </Text>
                  )}
                  {resendError && (
                    <Text size="2" color="red">
                      {resendError}
                    </Text>
                  )}
                  <Button
                    size="3"
                    variant="soft"
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending...' : 'Resend verification email'}
                  </Button>
                </>
              )}
              <Button
                size="3"
                type="submit"
                disabled={!email.trim() || !password.trim() || isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Flex justify="between">
                <Link href="/signup" prefetch={false} className="text-link">
                  <Text size="2">Create account</Text>
                </Link>
                <Link href="/forgot-password" prefetch={false} className="text-link">
                  <Text size="2">Forgot password?</Text>
                </Link>
              </Flex>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </div>
  )
}
