'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // PERF FIX: Increase stale time — most data doesn't change every 2 minutes
        staleTime: 5 * 60_000,    // 5 min — data stays fresh (was 2 min)
        gcTime: 15 * 60_000,      // 15 min — keep in cache (was 10 min)
        retry: 1,                  // PERF FIX: Reduce retries — 2 retries adds 3-10s on failure
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000), // PERF FIX: Faster retry
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // PERF FIX: Show stale data immediately while refetching in background
        placeholderData: (prev: unknown) => prev,
      },
      mutations: {
        retry: 0, // PERF FIX: Never retry mutations — they may have side effects
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
