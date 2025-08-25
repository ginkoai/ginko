/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-14
 * @tags: [auth, layout, ui, styling, wrapper]
 * @related: [login/page.tsx, signup/page.tsx, auth-form.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, tailwind]
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  )
}