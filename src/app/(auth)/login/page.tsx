'use client'

import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Flex, Text, TextField } from '@/components/ui'
import { SKIP_MFA } from '@/lib/constants/auth'
import { supabase } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      if (!SKIP_MFA) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find((f) => f.status === 'verified')
        router.push(totp ? `/mfa?factorId=${totp.id}` : '/mfa/enroll')
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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <TextField.Root
                size="3"
                type={showPassword ? 'text' : 'password'}
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
              <Button
                size="3"
                type="submit"
                disabled={!email.trim() || !password.trim() || isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
              <Flex justify="end">
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
