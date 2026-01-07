/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-06
 * @tags: [auth, device-flow, cli, code-entry]
 * @related: [api/auth/device/authorize/route.ts, cli/commands/login.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, react, supabase]
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default function DeviceAuthPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorizing, setAuthorizing] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'input' | 'success' | 'error'>('input')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()

    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Focus input when user is logged in
  useEffect(() => {
    if (user && inputRef.current) {
      inputRef.current.focus()
    }
  }, [user])

  const handleGitHubSignIn = async () => {
    const supabase = createClient()
    setLoading(true)

    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        // Redirect back to this page after login
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/device`,
        skipBrowserRedirect: false
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code.trim()) {
      setErrorMessage('Please enter the code from your CLI')
      return
    }

    setAuthorizing(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/device/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: code.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Authorization failed')
        setStatus('error')
        setAuthorizing(false)
        return
      }

      setStatus('success')
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.')
      setStatus('error')
      setAuthorizing(false)
    }
  }

  // Format code as user types (auto-add hyphen)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')

    // Auto-add hyphen after 4 characters
    if (value.length === 4 && !value.includes('-')) {
      value = value + '-'
    }

    // Limit to 9 characters (XXXX-XXXX)
    if (value.length <= 9) {
      setCode(value)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
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
              Authorize Ginko CLI
            </h1>
            <p className="text-slate-300">
              {status === 'success'
                ? 'Your CLI has been authorized!'
                : user
                  ? 'Enter the code displayed in your terminal'
                  : 'Sign in to authorize your CLI'
              }
            </p>
          </div>

          {/* Content based on state */}
          {status === 'success' ? (
            // Success state
            <div className="w-full space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-slate-300">
                  Your CLI is now connected. You can close this window and return to your terminal.
                </p>
              </div>
            </div>
          ) : !user ? (
            // Not logged in - show GitHub sign in
            <div className="w-full space-y-4">
              <button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                Sign in with GitHub
              </button>
              <p className="text-xs text-slate-400">
                You need to sign in to authorize the CLI
              </p>
            </div>
          ) : (
            // Logged in - show code entry form
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="XXXX-1234"
                  className="w-full text-center text-3xl font-mono tracking-widest px-4 py-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={authorizing}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authorizing || code.length < 9}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authorizing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authorizing...
                  </span>
                ) : (
                  'Authorize CLI'
                )}
              </button>

              <p className="text-xs text-slate-400">
                Signed in as {user.email || user.user_metadata?.user_name}
              </p>
            </form>
          )}

          {/* Help text */}
          <div className="pt-4 border-t border-white/10 w-full">
            <p className="text-xs text-slate-400">
              {status === 'success'
                ? 'This window can be safely closed'
                : 'The code expires in 10 minutes'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
