/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-11
 * @tags: [auth, login, react, nextjs, supabase, ginko-branding]
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
        <h1 className="text-3xl font-mono font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground mt-2">Sign in to your Ginko account with GitHub</p>
      </div>

      <AuthForm mode="signin" />
    </div>
  )
}