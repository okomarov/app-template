'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/app/actions/users'
import type { AuthUser } from '@/lib/auth/require-auth'

export function useCurrentUser() {
  const { data: currentUser = null, isLoading: loading } = useQuery<AuthUser | null>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: Infinity,
  })

  return { currentUser, loading }
}
