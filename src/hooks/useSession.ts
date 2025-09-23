"use client";
import useSWR from 'swr'

export type SessionUser = { id: string; email: string; name?: string | null }

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/session', (url) => fetch(url).then(r => r.json()), { revalidateOnFocus: false })
  return {
    user: (data?.isAuthenticated ? (data?.user as SessionUser) : null) || null,
    isAuthenticated: Boolean(data?.isAuthenticated),
    loading: isLoading,
    error,
    refresh: mutate,
  } as const
}
