/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [auth, layout, ui, styling, wrapper, ginko-branding]
 * @related: [login/page.tsx, signup/page.tsx, auth-form.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, tailwind]
 */
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Ginko Logo */}
      <Link
        href="/"
        className="mb-8 font-mono text-3xl font-bold text-primary hover:text-primary/80 transition-colors"
      >
        ginko
      </Link>
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  )
}