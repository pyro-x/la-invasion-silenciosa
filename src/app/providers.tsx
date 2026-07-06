import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// retry: 1 (instead of TanStack's default 3): on a phone with bad coverage,
// three exponential-backoff retries mean 10+ seconds of a fake-empty screen
// before the UI can admit failure. One retry, then show the error state.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
})

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
