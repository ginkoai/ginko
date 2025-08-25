/**
 * @fileType: provider
 * @status: current
 * @updated: 2025-08-14
 * @tags: [providers, context, supabase, theme, mui, auth-state]
 * @related: [client.ts, auth-form.tsx, layout.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, supabase, mui/material]
 */
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient>

type SupabaseContext = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

// Create a theme for Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#7c3aed',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Context.Provider value={{ supabase, user, loading }}>
        {children}
      </Context.Provider>
    </ThemeProvider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside Providers')
  }
  return context
}