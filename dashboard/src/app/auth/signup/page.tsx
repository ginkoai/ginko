/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-11
 * @tags: [auth, signup, registration, ui, onboarding, ginko-branding]
 * @related: [auth-form.tsx, login/page.tsx, layout.tsx]
 * @priority: critical
 * @complexity: low
 * @dependencies: [react, auth-form]
 */
import { AuthForm } from '@/components/auth/auth-form'

export default function SignupPage() {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-mono font-bold text-foreground">Get started</h1>
        <p className="text-muted-foreground mt-2">Create your Ginko account</p>
      </div>

      <AuthForm mode="signup" />
    </div>
  )
}