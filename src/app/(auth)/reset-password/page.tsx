'use client'

import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { updatePasswordAction } from '@/app/actions/users'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { SKIP_MFA } from '@/lib/constants/auth'
import { supabase } from '@/lib/supabase/client'
import styles from '../login/login.module.css'

// Strict policy: any verified TOTP factor forces MFA before password change,
// regardless of `nextLevel` (recovery sessions don't always promote it).
async function redirectIfMfaRequired(router: ReturnType<typeof useRouter>): Promise<boolean> {
  if (SKIP_MFA) return false

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === 'aal2') return false

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp?.find((f) => f.status === 'verified')
  if (!totp) return false

  router.replace(`/mfa?factorId=${totp.id}&returnTo=/reset-password`)
  return true
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const validate = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setError('Invalid or expired reset link. Please request a new one.')
          setIsValidatingToken(false)
          return
        }

        const redirected = await redirectIfMfaRequired(router)
        if (redirected) return

        setIsValidatingToken(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate reset link.')
        setIsValidatingToken(false)
      }
    }

    validate()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updatePasswordAction(password)
      if (!result.ok) {
        setError(result.error)
      } else {
        setSuccess(true)
        await supabase.auth.signOut()
        router.replace('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidatingToken) {
    return (
      <Flex justify="center" align="center" className={styles.fullHeight}>
        <Text>Validating reset link...</Text>
      </Flex>
    )
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
            Set New Password
          </Text>
          {success ? (
            <Flex direction="column" gap="3">
              <Text size="3" align="center" color="green">
                Password updated successfully! Redirecting to login...
              </Text>
            </Flex>
          ) : (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="3">
                <Text size="2" color="gray" align="center">
                  Please enter your new password below.
                </Text>
                <TextField.Root
                  size="3"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
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
                      onClick={(e) => {
                        e.preventDefault()
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
                  placeholder="Confirm New Password"
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
                      onClick={(e) => {
                        e.preventDefault()
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
                  disabled={!password.trim() || !confirmPassword.trim() || isSubmitting}
                  className={styles.fullWidth}
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
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
