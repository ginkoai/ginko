/**
 * @fileType: page
 * @status: current
 * @updated: 2026-02-04
 * @tags: [dashboard, settings, api-key, react, nextjs, projects]
 * @related: [dashboard/page.tsx, server.ts, DeleteProjectModal.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { KeyIcon, UserIcon, BoltIcon, FolderIcon, CreditCardIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { TeamMemberList, DeleteProjectModal } from '@/components/team'
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
  member_count?: number;
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
  const { graphId, projects, refresh } = useUserGraph()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{ projectName: string; graphId: string } | null>(null)
  const [projectPage, setProjectPage] = useState(0)
  const [projectFilter, setProjectFilter] = useState('')
  const projectsPerPage = 10
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

          // Fetch ALL user's teams with pagination (API caps at 100 per request)
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            try {
              const allTeams: Team[] = []
              let offset = 0
              const pageSize = 100
              let hasMore = true

              while (hasMore) {
                const teamsRes = await fetch(`/api/v1/teams?limit=${pageSize}&offset=${offset}`, {
                  headers: { Authorization: `Bearer ${session.access_token}` }
                })
                if (!teamsRes.ok) break
                const teamsData = await teamsRes.json()
                const batch = teamsData.teams || []
                allTeams.push(...batch)
                hasMore = batch.length === pageSize
                offset += pageSize
              }

              setTeams(allTeams)
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

  const handleProjectDeleted = () => {
    setDeleteModal(null)
    // Remove the deleted team from local state
    if (deleteModal) {
      setTeams(prev => {
        const remaining = prev.filter(t => t.graph_id !== deleteModal.graphId)
        // Reset page if current page would be empty
        const maxPage = Math.max(0, Math.ceil(remaining.length / projectsPerPage) - 1)
        if (projectPage > maxPage) setProjectPage(maxPage)
        return remaining
      })
    }
    // Refresh the global project context
    refresh()
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
              Manage your subscription, seats, and payment methods
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CreditCardIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-medium text-foreground mb-2">Billing</h3>
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

      {/* Projects Section */}
      {teams.length > 0 && (() => {
        const filterLower = projectFilter.toLowerCase();
        const filteredTeams = filterLower
          ? teams.filter(t => {
              const name = getProjectNameForTeam(t.graph_id, projects) || t.name;
              return name.toLowerCase().includes(filterLower);
            })
          : teams;
        const totalPages = Math.ceil(filteredTeams.length / projectsPerPage);
        const safePage = Math.min(projectPage, Math.max(0, totalPages - 1));
        const pagedTeams = filteredTeams.slice(safePage * projectsPerPage, (safePage + 1) * projectsPerPage);
        return (
          <div id="projects" className="scroll-mt-20">
            <div className="mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <FolderIcon className="h-5 w-5 text-primary" />
                    Projects
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Manage your projects, team members, and invite collaborators
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredTeams.length}{filterLower ? ` of ${teams.length}` : ''} project{filteredTeams.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Search filter */}
              <div className="relative mt-3">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter projects by name..."
                  value={projectFilter}
                  onChange={(e) => { setProjectFilter(e.target.value); setProjectPage(0); }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            {pagedTeams.map((team) => {
              const projectName = getProjectNameForTeam(team.graph_id, projects) || team.name;
              const isOwner = team.role === 'owner';
              return (
                <div key={team.id} className="mb-4 bg-card rounded-lg border border-border shadow-sm">
                  {/* Project Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FolderIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{projectName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {isOwner ? 'Owner' : 'Member'}
                          {team.member_count !== undefined && ` · ${team.member_count} member${team.member_count !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    {isOwner && team.graph_id && (
                      <button
                        onClick={() => setDeleteModal({ projectName, graphId: team.graph_id! })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete project"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  {/* Team Members */}
                  <div className="p-4">
                    <TeamMemberList
                      teamId={team.id}
                      currentUserId={user?.id}
                      showInviteButton={isOwner}
                    />
                  </div>
                </div>
              );
            })}
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 pb-4">
                <button
                  onClick={() => setProjectPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setProjectPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Delete Project Modal */}
      {deleteModal && (
        <DeleteProjectModal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          onDeleted={handleProjectDeleted}
          projectName={deleteModal.projectName}
          graphId={deleteModal.graphId}
        />
      )}
    </div>
  )
}
