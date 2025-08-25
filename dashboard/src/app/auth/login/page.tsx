/**
 * @fileType: page
 * @status: current
 * @updated: 2025-01-31
 * @tags: [auth, login, react, nextjs, supabase]
 * @related: [auth-form.tsx, signup/page.tsx, providers.tsx]
 * @priority: critical
 * @complexity: low
 * @dependencies: [next]
 */

import { AuthForm } from '@/components/auth/auth-form'

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back - OAuth Only!</h1>
        <p className="text-gray-600 mt-2">Sign in to your Ginko account with GitHub</p>
        <p className="text-xs text-gray-400 mt-1">Deployed: {new Date().toISOString()}</p>
      </div>
      
      <AuthForm mode="signin" />
    </div>
  )
}