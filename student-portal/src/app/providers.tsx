'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // PERF FIX: Increase stale time — student data changes infrequently
        staleTime: 5 * 60_000,    // 5 min (was 2 min)
        gcTime: 15 * 60_000,      // 15 min (was 10 min)
        retry: 1,                  // PERF FIX: Reduce retries
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // PERF FIX: Show stale data immediately while refetching
        placeholderData: (prev: unknown) => prev,
      },
      mutations: {
        retry: 0,
      },
    },
  }))
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
