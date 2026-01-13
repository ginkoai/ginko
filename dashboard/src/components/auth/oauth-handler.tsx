/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-01
 * @tags: [auth, oauth, hash-fragments, client-side, supabase, github]
 * @related: [auth-form.tsx, callback/route.ts, providers.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, next/navigation, @/components/providers]
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers'

export function OAuthHandler() {
  const router = useRouter()
  const { supabase } = useSupabase()

  useEffect(() => {
    // Handle OAuth redirect with hash fragments
    const handleOAuthRedirect = async () => {
      // Don't handle on device auth page (CLI flow handles its own navigation)
      if (window.location.pathname.startsWith('/auth/device')) {
        return
      }

      // Check for hash fragments (Supabase returns tokens as fragments)
      if (window.location.hash) {
        // Don't process if already on a dashboard page (prevents deep link interruption)
        if (window.location.pathname.startsWith('/dashboard')) {
          return
        }
        // Supabase automatically handles the hash fragments
        // Just wait a moment for it to process
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            router.push('/dashboard')
          }
        }, 1000)
      }
    }

    handleOAuthRedirect()
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Don't redirect if on device auth page (CLI flow handles its own navigation)
        if (window.location.pathname.startsWith('/auth/device')) {
          return
        }
        // Don't redirect if already on a dashboard page (prevents deep link interruption)
        if (window.location.pathname.startsWith('/dashboard')) {
          return
        }
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return null
}