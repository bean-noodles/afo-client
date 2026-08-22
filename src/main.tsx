import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ApiError } from './api.ts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Squad/session data doesn't change from outside this tab mid-session,
      // so avoid refetching on every window focus.
      refetchOnWindowFocus: false,
      // A 401 means the token is dead — retrying only delays the bounce to
      // the login screen.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 401) &&
        failureCount < 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
