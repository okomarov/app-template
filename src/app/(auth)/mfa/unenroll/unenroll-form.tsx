'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { unenrollMfaAction } from '@/app/actions/users'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import styles from '../../login/login.module.css'

export function UnenrollForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = useCallback(async () => {
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const result = await unenrollMfaAction(code)
      if (!result.ok) {
        setError(result.error)
        // Clear the input so the auto-submit effect doesn't re-fire the same
        // wrong code on next render.
        setCode('')
        return
      }
      await supabase.auth.signOut()
      router.replace('/login')
    } finally {
      setSubmitting(false)
    }
  }, [code, submitting, router])

  useEffect(() => {
    if (code.length === 6 && !submitting) {
      submit()
    }
  }, [code, submitting, submit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submit()
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
            Disable Two-Factor Authentication
          </Text>
          <Text size="2" color="gray" align="center">
            Enter the current 6-digit code from your authenticator app to remove it from your
            account. You'll be signed out and will sign in without MFA next time.
          </Text>
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <TextField.Root
                size="3"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                disabled={submitting}
                maxLength={6}
                autoFocus
              />
              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}
              <Button
                size="3"
                color="red"
                type="submit"
                loading={submitting}
                disabled={code.length !== 6}
              >
                Disable two-factor
              </Button>
              <Link href="/" className={styles.fullWidth}>
                <Button size="3" variant="ghost" color="gray" type="button">
                  Cancel
                </Button>
              </Link>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </div>
  )
}
