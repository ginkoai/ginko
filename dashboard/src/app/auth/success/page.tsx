/**
 * @fileType: page
 * @status: current
 * @updated: 2025-08-14
 * @tags: [auth, success, redirect, client-side, debug]
 * @related: [callback/route.ts, auth-form.tsx, dashboard/page.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, next/navigation, supabase]
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers'

export default function AuthSuccess() {
  const router = useRouter()
  const { user, loading, supabase } = useSupabase()
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (message: string) => {
    console.log(message)
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    const handleAuthSuccess = async () => {
      addDebug('AuthSuccess component mounted')
      addDebug(`Loading: ${loading}, User: ${user?.email || 'null'}`)
      
      // Check auth state directly
      const { data: { session }, error } = await supabase.auth.getSession()
      addDebug(`Session check: ${session?.user?.email || 'no session'}, Error: ${error?.message || 'none'}`)
      
      // Wait for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      addDebug(`Direct user check: ${currentUser?.email || 'no user'}`)
      
      if (currentUser) {
        addDebug('User authenticated, redirecting to dashboard')
        window.location.href = '/dashboard' // Force navigation
      } else {
        addDebug('No user found, redirecting to login')
        router.push('/auth/login')
      }
    }

    handleAuthSuccess()
  }, [supabase, router, loading, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Debugging authentication...</p>
        
        <div className="mt-6 text-left bg-gray-100 p-4 rounded text-xs max-h-40 overflow-y-auto">
          {debugInfo.map((info, i) => (
            <div key={i} className="mb-1">{info}</div>
          ))}
        </div>
      </div>
    </div>
  )
}