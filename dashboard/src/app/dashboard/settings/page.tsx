/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-17
 * @tags: [dashboard, settings, api-key, react, nextjs, adhoc_260117_s01]
 * @related: [dashboard/page.tsx, server.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { KeyIcon, UserIcon, BoltIcon, UsersIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { TeamMemberList } from '@/components/team'
import { useUserGraph } from '@/contexts/UserGraphContext'

/**
 * Get project name for a team by looking up its graph_id in the projects list
 */
function getProjectNameForTeam(graphId: string | undefined, projects: { graphId: string; projectName: string }[]): string | undefined {
  if (!graphId) return undefined;
  const project = projects.find(p => p.graphId === graphId);
  return project?.projectName;
}

interface Team {
  id: string;
  name: string;
  role: string;
  graph_id?: string;
}

interface UserProfile {
  api_key_hash?: string
  api_key_prefix?: string
  api_key_created_at?: string
  github_username?: string
  subscription_tier?: string
  // Temporary storage for the actual key (only available after generation)
  temp_api_key?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { graphId, projects } = useUserGraph()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          setProfile(profile)

          // Fetch user's teams for current project
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token && graphId) {
            try {
              // Filter teams by current project's graphId
              const teamsRes = await fetch(`/api/v1/teams?graphId=${encodeURIComponent(graphId)}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
              })
              if (teamsRes.ok) {
                const teamsData = await teamsRes.json()
                setTeams(teamsData.teams || [])
              }
            } catch (err) {
              console.error('Failed to fetch teams:', err)
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase, graphId])


  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Ginko account and API configuration
        </p>
      </div>

      {/* API Key Section - Redirect to dedicated page */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-primary" />
            API Key Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your Ginko API keys for development environment integration
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <KeyIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="font-medium text-foreground mb-2">API Key Management</h3>
            <p className="text-muted-foreground mb-6">
              Generate, view, and manage your API keys in the dedicated API keys section
            </p>
            <div className="space-x-3">
              <button
                onClick={() => router.push('/dashboard/settings/api-keys')}
                className="inline-flex items-center px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                Manage API Keys
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div id="account" className="bg-card rounded-lg border border-border shadow-sm scroll-mt-20">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Account Information
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm text-foreground mt-1">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm text-foreground mt-1">
                {user.user_metadata?.full_name || user.user_metadata?.name || 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">GitHub Username</label>
              <p className="text-sm text-foreground mt-1">
                {profile?.github_username || 'Not linked'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Subscription</label>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-secondary text-muted-foreground mt-1">
                {profile?.subscription_tier || 'free'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Section */}
      {teams.some(t => t.role === 'owner') && (
        <div className="bg-card rounded-lg border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              Billing & Subscription
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your team&apos;s subscription, seats, and payment methods
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CreditCardIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-medium text-foreground mb-2">Team Billing</h3>
              <p className="text-muted-foreground mb-6">
                View seat usage, subscription status, and manage payments
              </p>
              <div className="space-x-3">
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  className="inline-flex items-center px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  View Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      {teams.length > 0 && (
        <div id="team" className="scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              Team
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage your team members and invite collaborators
            </p>
          </div>
          {teams.map((team) => {
            const projectName = getProjectNameForTeam(team.graph_id, projects);
            return (
              <div key={team.id} className="mb-6">
                {/* Show project name for clarity when multiple teams exist */}
                {teams.length > 1 && (
                  <div className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{projectName || team.name}</span>
                    {projectName && projectName !== team.name && (
                      <span className="ml-2">({team.name})</span>
                    )}
                  </div>
                )}
                <TeamMemberList
                  teamId={team.id}
                  currentUserId={user?.id}
                  showInviteButton={team.role === 'owner'}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-primary" />
            Quick Actions
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <h4 className="font-medium text-foreground">Create New Project</h4>
              <p className="text-sm text-muted-foreground">
                Use our installer to set up a new project with Ginko
              </p>
            </div>
            <div className="terminal">
              <div className="terminal-body py-2 px-3">
                npx create-ginko-project
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
