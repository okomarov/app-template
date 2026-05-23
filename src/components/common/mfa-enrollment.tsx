import { useCallback, useEffect, useRef, useState } from 'react'
import { markUserMfaEnrolled } from '@/app/actions/users'
import { Button, Card, Flex, Text, TextField } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import styles from './mfa-enrollment.module.css'

interface MfaEnrollmentProps {
  onEnrollmentSuccess: () => Promise<void> | void
  // Optional Skip handler. When provided, renders a "Skip for now" button
  // alongside Verify. The host is responsible for persisting the choice so
  // the user isn't re-prompted on next sign-in.
  onSkip?: () => Promise<void> | void
}

// Supabase returns the QR as `data:image/svg+xml;utf-8,<svg …>` — a
// non-standard data URI that browsers won't render via <img src>.
// Re-encode to a spec-compliant URL form so we can use a plain <img>.
function normalizeQrSrc(qrCode: string): string {
  const inline = qrCode.split('data:image/svg+xml;utf-8,')[1]
  if (!inline) return qrCode
  return `data:image/svg+xml,${encodeURIComponent(inline)}`
}

export function MfaEnrollment({ onEnrollmentSuccess, onSkip }: MfaEnrollmentProps) {
  const [isSkipping, setIsSkipping] = useState(false)
  const [step, setStep] = useState<'loading' | 'ready' | 'success'>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrSrc, setQrSrc] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // React 19 Strict Mode double-invokes effects; we must not re-issue
  // enroll/unenroll calls (Supabase factors are real side-effects).
  const enrolledOnce = useRef(false)

  useEffect(() => {
    if (enrolledOnce.current) return
    enrolledOnce.current = true

    let cancelled = false

    async function startEnrollment() {
      try {
        const { data: listData } = await supabase.auth.mfa.listFactors()
        const unverified = (listData?.all ?? []).filter(
          (f) => f.factor_type === 'totp' && f.status === 'unverified',
        )
        await Promise.all(
          unverified.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {})),
        )

        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `totp-${Date.now()}`,
        })
        if (cancelled) return
        if (enrollError) throw enrollError
        if (!data) throw new Error('No data returned from enrollment')

        setFactorId(data.id)
        setQrSrc(normalizeQrSrc(data.totp.qr_code))
        setSecret(data.totp.secret)
        setStep('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment.')
      }
    }

    startEnrollment()

    return () => {
      cancelled = true
    }
  }, [])

  const verifyCode = useCallback(async () => {
    if (!factorId) return
    setError(null)
    setSubmitting(true)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError) throw challengeError
      if (!challengeData) throw new Error('No challenge data returned')

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })
      if (verifyError) throw verifyError

      const synced = await markUserMfaEnrolled()
      if (!synced.ok) throw new Error(synced.error)
      setStep('success')
      await onEnrollmentSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.')
      // Clear the input so the auto-submit effect doesn't immediately
      // re-fire with the same wrong code once submitting flips back to false.
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }, [factorId, code, onEnrollmentSuccess])

  useEffect(() => {
    if (step === 'ready' && code.length === 6 && !submitting && !isSkipping) {
      verifyCode()
    }
  }, [code, step, submitting, isSkipping, verifyCode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void verifyCode()
  }

  return (
    <Flex justify="center" align="center" className={styles.container}>
      <Card className={styles.card}>
        <Flex direction="column" gap="4" align="center">
          <Text size="5" weight="bold">
            Set Up Multi-Factor Authentication
          </Text>

          {step === 'loading' && (
            <Text size="3" color="gray">
              Loading enrollment details…
            </Text>
          )}

          {step === 'ready' && (
            <>
              <Text size="3" align="center">
                Scan with your authenticator app, then enter the 6-digit code.
              </Text>
              {qrSrc && (
                // biome-ignore lint/performance/noImgElement: SVG data URI from Supabase MFA API; next/image not needed
                <img src={qrSrc} alt="MFA enrollment QR code" className={styles.qr} />
              )}
              <Flex direction="column" gap="1" align="center">
                <Text size="2" color="gray">
                  Or enter this secret manually:
                </Text>
                <Text size="2" weight="bold" className={styles.secret}>
                  {secret}
                </Text>
              </Flex>
              <form onSubmit={handleSubmit} className={styles.verifyForm}>
                <Flex direction="column" gap="3" align="center">
                  <TextField.Root
                    size="3"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className={styles.codeInput}
                  />
                  <Button size="3" type="submit" loading={submitting} disabled={code.length !== 6}>
                    Verify
                  </Button>
                  {onSkip && (
                    <Button
                      size="3"
                      variant="ghost"
                      type="button"
                      disabled={submitting || isSkipping}
                      onClick={async () => {
                        setError(null)
                        setIsSkipping(true)
                        try {
                          // Drop the unverified factor created on mount so it
                          // doesn't linger in auth.mfa_factors; the user is
                          // opting out, not pausing mid-enrollment.
                          if (factorId) {
                            await supabase.auth.mfa
                              .unenroll({ factorId })
                              .catch((err) =>
                                console.warn(
                                  '[mfa.enroll] unenroll on skip failed (non-fatal)',
                                  err,
                                ),
                              )
                          }
                          await onSkip()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to skip MFA setup.')
                        } finally {
                          setIsSkipping(false)
                        }
                      }}
                    >
                      {isSkipping ? 'Skipping...' : 'Skip for now'}
                    </Button>
                  )}
                </Flex>
              </form>
            </>
          )}

          {step === 'success' && (
            <Text color="green" size="4" weight="bold">
              MFA enrollment complete! You can now use your authenticator app to log in.
            </Text>
          )}

          {error && (
            <Text color="red" size="2" align="center">
              {error}
            </Text>
          )}
        </Flex>
      </Card>
    </Flex>
  )
}
