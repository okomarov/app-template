'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Flex, Text } from '@/components/ui'
import { useCurrentUser } from '@/hooks/use-current-user'
import { supabase } from '@/lib/supabase/client'
import styles from './header.module.css'

export function Header() {
  const { currentUser } = useCurrentUser()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className={styles.header}>
      <Flex justify="between" align="center" className={styles.headerContent}>
        <Flex align="center" gap="6">
          <Link href="/">
            <Text size="4" weight="bold">
              App Name
            </Text>
          </Link>
        </Flex>

        <Flex align="center" gap="3">
          {currentUser && (
            <Text size="2" color="gray">
              {currentUser.name}
            </Text>
          )}
          <Button variant="ghost" color="gray" onClick={handleLogout}>
            <LogOut size={14} />
            Log out
          </Button>
        </Flex>
      </Flex>
    </header>
  )
}
