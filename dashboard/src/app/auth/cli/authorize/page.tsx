/**
 * @fileType: page
 * @status: current
 * @updated: 2025-11-04
 * @tags: [auth, cli, oauth, authorize]
 * @related: [api/auth/cli/session/route.ts, cli/commands/login.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, supabase]
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic'

function AuthorizeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'authorizing' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      setStatus('error')
      setError('Missing session ID. Please restart the login process.')
      return
    }

    // Store session_id in cookie for server-side callback to read
    // Cookie expires in 10 minutes (longer than the 5min session TTL)
    document.cookie = `cli_session_id=${sessionId}; path=/; max-age=600; samesite=lax`

    // Also store in sessionStorage as backup
    sessionStorage.setItem('cli_session_id', sessionId)

    // Initiate OAuth flow
    const supabase = createClient()

    setStatus('authorizing')

    // Sign out first to ensure fresh OAuth flow, then initiate OAuth
    supabase.auth.signOut().then(() => {
      return supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          // No query parameters needed - callback will read cookie
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        }
      })
    }).catch((err) => {
      setStatus('error')
      setError(err.message || 'Failed to initiate authentication')
    })
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo/Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Authenticate Ginko CLI
            </h1>
            <p className="text-slate-300">
              Connecting your CLI to your Ginko account
            </p>
          </div>

          {/* Status */}
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              <p className="text-slate-300">Initializing authentication...</p>
            </div>
          )}

          {status === 'authorizing' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-pulse flex flex-col items-center">
                <div className="rounded-full h-12 w-12 bg-purple-500/50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-300">Redirecting to GitHub...</p>
                <p className="text-sm text-slate-400 mt-2">
                  You'll be asked to authorize Ginko with your GitHub account
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full h-12 w-12 bg-red-500/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-red-300 font-medium">Authentication Error</p>
                <p className="text-sm text-slate-400 mt-2">{error}</p>
              </div>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="pt-4 border-t border-white/10 w-full">
            <p className="text-xs text-slate-400 text-center">
              This window will close automatically after authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CLIAuthorizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <AuthorizeContent />
    </Suspense>
  )
}
