import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="h-screen bg-background">
      <DashboardNav user={user} />
      <main className="h-[calc(100vh-4rem)] overflow-auto bg-background">
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}