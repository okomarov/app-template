'use client'

import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signUpAction } from '@/app/actions/auth'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { isAllowedAuthEmail, nameFromEmail, normalizeAuthEmail } from '@/lib/auth/email'
import { supabase } from '@/lib/supabase/client'
import styles from '../login/login.module.css'

interface SignupFormProps {
  initialEmail: string
}

export function SignupForm({ initialEmail }: SignupFormProps) {
  const normalizedInitialEmail = normalizeAuthEmail(initialEmail)
  const [name, setName] = useState(nameFromEmail(normalizedInitialEmail))
  const [email, setEmail] = useState(normalizedInitialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedEmail = normalizeAuthEmail(email)
    setError('')
    setSuccess('')

    if (!isAllowedAuthEmail(normalizedEmail)) {
      setError('Email domain is not allowed for signup.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await signUpAction({
        name,
        email: normalizedEmail,
        password,
        confirmPassword,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEmail(normalizedEmail)
      setSuccess(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResendMessage('')
    setResendError('')
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
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
            Create Account
          </Text>
          {success ? (
            <Flex direction="column" gap="3">
              <Text size="3" align="center" color="green">
                {success}
              </Text>
              <Text size="2" color="gray" align="center">
                Follow the verification link before signing in.
              </Text>
              {resendMessage && (
                <Text size="2" color="green" align="center">
                  {resendMessage}
                </Text>
              )}
              {resendError && (
                <Text size="2" color="red" align="center">
                  {resendError}
                </Text>
              )}
              <Button
                size="3"
                variant="soft"
                onClick={handleResend}
                disabled={isResending}
                className={styles.fullWidth}
              >
                {isResending ? 'Sending...' : 'Resend verification email'}
              </Button>
              <Button size="3" onClick={() => router.push('/login')} className={styles.fullWidth}>
                Back to Login
              </Button>
            </Flex>
          ) : (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <TextField.Root
                  size="3"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <TextField.Root
                  size="3"
                  type="email"
                  name="username"
                  autoComplete="username"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <TextField.Root
                  size="3"
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  autoComplete="new-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <TextField.Slot side="right">
                    <Button
                      variant="ghost"
                      type="button"
                      tabIndex={-1}
                      onClick={(event) => {
                        event.preventDefault()
                        setShowPassword(!showPassword)
                      }}
                      className={styles.passwordToggle}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                    </Button>
                  </TextField.Slot>
                </TextField.Root>
                <TextField.Root
                  size="3"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <TextField.Slot side="right">
                    <Button
                      variant="ghost"
                      type="button"
                      tabIndex={-1}
                      onClick={(event) => {
                        event.preventDefault()
                        setShowConfirmPassword(!showConfirmPassword)
                      }}
                      className={styles.passwordToggle}
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                    </Button>
                  </TextField.Slot>
                </TextField.Root>
                {error && (
                  <Text color="red" size="2">
                    {error}
                  </Text>
                )}
                <Button
                  size="3"
                  type="submit"
                  disabled={
                    !name.trim() ||
                    !email.trim() ||
                    !password.trim() ||
                    !confirmPassword.trim() ||
                    isSubmitting
                  }
                  className={styles.fullWidth}
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
                <Flex justify="center">
                  <Link href="/login" prefetch={false} className="text-link">
                    <Text size="2">Back to Login</Text>
                  </Link>
                </Flex>
              </Flex>
            </form>
          )}
        </Flex>
      </Flex>
    </div>
  )
}
