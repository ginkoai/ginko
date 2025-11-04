/**
 * @fileType: page
 * @status: current
 * @updated: 2025-11-04
 * @tags: [auth, cli, oauth, success]
 * @related: [auth/callback/route.ts, cli/commands/login.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [next]
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic'

function CompleteContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'success' | 'error'>('success')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const statusParam = searchParams.get('status')
    const messageParam = searchParams.get('message')

    if (statusParam === 'error') {
      setStatus('error')
      setMessage(messageParam || 'Authentication failed')
    } else {
      setStatus('success')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon */}
          {status === 'success' ? (
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* Title */}
          <div>
            {status === 'success' ? (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Authentication Successful!
                </h1>
                <p className="text-slate-300 text-lg">
                  Your CLI has been authenticated
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Authentication Failed
                </h1>
                <p className="text-red-300 text-lg">
                  {message}
                </p>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3 w-full">
            {status === 'success' ? (
              <>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-sm text-slate-300">
                    ✓ Your CLI is now connected to your Ginko account
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-sm text-slate-300">
                    You can close this window and return to your terminal
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-sm text-slate-300">
                    Please try running <code className="bg-black/30 px-2 py-1 rounded">ginko login</code> again
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Auto-close notice */}
          <div className="pt-4 border-t border-white/10 w-full">
            <p className="text-xs text-slate-400">
              This window can be safely closed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CLICompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  )
}
