/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [auth, oauth, github, react, client-component, supabase, ginko-branding]
 * @related: [providers.tsx, login/page.tsx, signup/page.tsx, ui/button.tsx]
 * @priority: critical
 * @complexity: low
 * @dependencies: [react, next, supabase, react-hot-toast]
 * @description: GitHub OAuth-only authentication component with ginko dark theme
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import toast from 'react-hot-toast'

interface AuthFormProps {
  mode: 'signin' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { supabase } = useSupabase()
  const router = useRouter()

  const isSignUp = mode === 'signup'

  const handleGitHubSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false
        },
      })

      if (error) throw error

      // Show loading state while redirecting
      toast.loading('Redirecting to GitHub...')
    } catch (error: any) {
      setError(error.message)
      toast.error(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
      <div className="space-y-6">
        {/* Welcome message */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {isSignUp
              ? 'Join thousands of developers using Ginko to enhance their AI-assisted development workflow'
              : 'Welcome back! Sign in to continue'
            }
          </p>
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {/* GitHub OAuth button */}
        <Button
          type="button"
          variant="default"
          className="w-full h-12 text-base font-mono font-medium"
          onClick={handleGitHubSignIn}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Redirecting to GitHub...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              {isSignUp ? 'Sign up with GitHub' : 'Sign in with GitHub'}
            </>
          )}
        </Button>

        {/* Why GitHub section */}
        <div className="bg-secondary rounded-lg p-4 space-y-3">
          <p className="text-sm font-mono font-medium text-foreground">Why GitHub?</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No passwords to remember</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure OAuth authentication</span>
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Instant access with existing GitHub account</span>
            </li>
          </ul>
        </div>

        {/* Alternative action */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={isSignUp ? '/auth/login' : '/auth/signup'}
              className="font-medium text-primary hover:text-primary/80"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-center text-muted-foreground">
          By signing {isSignUp ? 'up' : 'in'}, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}