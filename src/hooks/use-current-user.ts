'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrentUserAction } from '@/app/actions/users'
import type { AuthUser } from '@/lib/auth/require-auth'

export function useCurrentUser() {
  const { data: currentUser = null, isLoading: loading } = useQuery<AuthUser | null>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUserAction,
    staleTime: Infinity,
  })

  return { currentUser, loading }
}
