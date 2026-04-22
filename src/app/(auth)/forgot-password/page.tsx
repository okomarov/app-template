'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import styles from '../login/login.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      if (error) {
        setError(error.message || 'Failed to send reset email')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
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
            Reset Password
          </Text>
          {success ? (
            <Flex direction="column" gap="3">
              <Text size="3" align="center" color="green">
                Password reset email sent! Please check your inbox.
              </Text>
              <Button size="3" onClick={() => router.push('/login')} className={styles.fullWidth}>
                Back to Login
              </Button>
            </Flex>
          ) : (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <Text size="2" color="gray" align="center">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </Text>
                <TextField.Root
                  size="3"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                {error && (
                  <Text color="red" size="2">
                    {error}
                  </Text>
                )}
                <Button
                  size="3"
                  type="submit"
                  disabled={!email.trim() || isSubmitting}
                  className={styles.fullWidth}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Flex justify="center">
                  <Link href="/login" className="text-link">
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
