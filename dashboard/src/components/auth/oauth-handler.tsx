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
      // Check for hash fragments (Supabase returns tokens as fragments)
      if (window.location.hash) {
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
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return null
}