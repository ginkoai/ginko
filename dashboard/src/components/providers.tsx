/**
 * @fileType: provider
 * @status: current
 * @updated: 2025-12-11
 * @tags: [providers, context, supabase, theme, mui, auth-state, react-query]
 * @related: [client.ts, auth-form.tsx, layout.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, supabase, mui/material, @tanstack/react-query]
 */
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserGraphProvider } from '@/contexts/UserGraphContext'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient>

type SupabaseContext = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

// Create a React Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60_000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Create a dark theme for Material-UI aligned with Ginko brand
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C1F500', // Ginko green
    },
    secondary: {
      main: '#addc00', // Ginko green hover
    },
    background: {
      default: '#31332B', // Ginko bg
      paper: '#101010',   // Ginko surface
    },
    text: {
      primary: '#FAFAFA',
      secondary: '#C5C5B8',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h1: { fontFamily: 'JetBrains Mono, monospace' },
    h2: { fontFamily: 'JetBrains Mono, monospace' },
    h3: { fontFamily: 'JetBrains Mono, monospace' },
    h4: { fontFamily: 'JetBrains Mono, monospace' },
    h5: { fontFamily: 'JetBrains Mono, monospace' },
    h6: { fontFamily: 'JetBrains Mono, monospace' },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [supabase.auth])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Context.Provider value={{ supabase, user, loading }}>
          <UserGraphProvider>
            {children}
          </UserGraphProvider>
        </Context.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside Providers')
  }
  return context
}