import { useCallback, useEffect, useState } from 'react'
import { updateUserMfaEnrolledStatus } from '@/app/actions/users'
import { Button, Card, Flex, Text, TextField } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import styles from './mfa-enrollment.module.css'

interface MfaEnrollmentProps {
  onEnrollmentSuccess: (enrolledFactorId: string) => Promise<void> | void
}

export function MfaEnrollment({ onEnrollmentSuccess }: MfaEnrollmentProps) {
  const [step, setStep] = useState<'enrolling' | 'showing' | 'verifying' | 'success'>('enrolling')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const startEnrollment = useCallback(async () => {
    setStep('enrolling')
    setError(null)
    setLoading(true)
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
      if (enrollError) throw enrollError
      if (!data) throw new Error('No data returned from enrollment')

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('showing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startEnrollment()
  }, [startEnrollment])

  const challengeAndVerify = async () => {
    if (!factorId) {
      setError('Factor ID is missing. Please try enrolling again.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError) throw challengeError
      if (!challengeData) throw new Error('No challenge data returned')

      setChallengeId(challengeData.id)
      setStep('verifying')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to challenge MFA factor.')
    } finally {
      setLoading(false)
    }
  }

  const submitCode = useCallback(async () => {
    if (!challengeId || !factorId) {
      setError('Challenge or Factor ID is missing. Please try again.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
      if (verifyError) throw verifyError

      await updateUserMfaEnrolledStatus(true)

      setStep('success')
      await onEnrollmentSuccess(factorId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code.')
    } finally {
      setLoading(false)
    }
  }, [challengeId, factorId, code, onEnrollmentSuccess])

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitCode()
  }

  useEffect(() => {
    if (step === 'verifying' && code.length === 6 && !loading && challengeId && factorId) {
      submitCode()
    }
  }, [code, step, loading, challengeId, factorId, submitCode])

  // Supabase MFA enroll returns QR as a data:image/svg+xml;utf-8 URI.
  // Extract the SVG and render it. Content is from Supabase's trusted API, not user input.
  const renderQrCode = () => {
    if (!qrCode) return null
    const svgContent = qrCode.split('data:image/svg+xml;utf-8,')[1]
    // biome-ignore lint/performance/noImgElement: fallback for non-SVG QR from Supabase MFA API
    if (!svgContent) return <img src={qrCode} alt="QR Code" width={200} height={200} />
    return (
      <div
        style={{ width: 200, height: 200, margin: '16px 0' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from Supabase's trusted MFA enrollment API
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    )
  }

  return (
    <Flex justify="center" align="center" className={styles.container}>
      <Card className={styles.card}>
        <Flex direction="column" gap="4" align="center">
          <Text size="5" weight="bold">
            Set Up Multi-Factor Authentication
          </Text>
          {step === 'enrolling' && (
            <Text size="3" color="gray">
              Loading enrollment details...
            </Text>
          )}
          {step === 'showing' && (
            <>
              <Text size="3">Scan this QR code with your authenticator app:</Text>
              {renderQrCode()}
              <Text size="2">Or enter this secret manually:</Text>
              <Text size="3" weight="bold" className={styles.secret}>
                {secret}
              </Text>
              <Button variant="outline" onClick={challengeAndVerify} disabled={loading} size="3">
                Next: Enter Code
              </Button>
            </>
          )}
          {step === 'verifying' && (
            <form onSubmit={handleVerifySubmit} className={styles.verifyForm}>
              <Flex direction="column" gap="3" align="center">
                <Text size="3">Enter the 6-digit code from your authenticator app:</Text>
                <TextField.Root
                  size="3"
                  type="text"
                  placeholder="MFA code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  className={styles.codeInput}
                />
                <Button
                  size="3"
                  type="submit"
                  loading={loading}
                  disabled={code.trim().length === 0}
                >
                  Verify
                </Button>
              </Flex>
            </form>
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
