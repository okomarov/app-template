'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import styles from '../login/login.module.css'

export default function MfaVerify() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const paramFactorId = searchParams.get('factorId')
    if (paramFactorId) {
      setFactorId(paramFactorId)
      inputRef.current?.focus()
      return
    }
    supabase.auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      if (factorsError || !data?.totp?.length) {
        router.replace('/login')
        return
      }
      const totp = data.totp.find((f) => f.status === 'verified')
      if (!totp) {
        router.replace('/mfa/enroll')
        return
      }
      setFactorId(totp.id)
      inputRef.current?.focus()
    })
  }, [router, searchParams])

  const submitCode = useCallback(async () => {
    if (!factorId || isVerifying) return
    setError('')
    setIsVerifying(true)

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (verifyError) throw verifyError

      const rawReturn = searchParams.get('returnTo')
      const returnTo = rawReturn?.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/'
      router.push(returnTo)
    } catch {
      setError('Invalid MFA code')
    } finally {
      setIsVerifying(false)
    }
  }, [factorId, code, isVerifying, router, searchParams])

  useEffect(() => {
    if (factorId && code.length === 6) {
      submitCode()
    }
  }, [factorId, code, submitCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitCode()
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
            Verify MFA
          </Text>
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <TextField.Root
                size="3"
                type="text"
                placeholder="Enter MFA code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                ref={inputRef}
                disabled={isVerifying}
                maxLength={6}
              />
              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}
              <Button
                size="3"
                type="submit"
                disabled={code.trim() === '' || isVerifying || code.length !== 6}
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </div>
  )
}
