/**
 * @fileType: page
 * @status: current
 * @updated: 2025-08-14
 * @tags: [auth, signup, registration, ui, onboarding]
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
        <h1 className="text-3xl font-bold text-gray-900">Get started</h1>
        <p className="text-gray-600 mt-2">Create your Ginko account</p>
      </div>
      
      <AuthForm mode="signup" />
    </div>
  )
}