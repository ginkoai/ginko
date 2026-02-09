/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [insights, member-filter, team, dropdown, epic-008]
 * @related: [InsightsOverview.tsx, page-client.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons]
 */
'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { ChevronDownIcon, UserCircleIcon, UsersIcon } from '@heroicons/react/24/outline'

interface TeamMember {
  user_id: string
  role: 'owner' | 'member'
  user: {
    id: string
    email: string
    github_username?: string
    full_name?: string
    avatar_url?: string
  } | null
}

interface Team {
  id: string
  name: string
  role: 'owner' | 'member'
}

interface MemberFilterProps {
  currentUserId: string
  currentUserEmail: string
  selectedMemberId: string | null
  onMemberChange: (memberId: string | null, memberEmail: string | null) => void
  graphId?: string | null
}

export function MemberFilter({
  currentUserId,
  currentUserEmail,
  selectedMemberId,
  onMemberChange,
  graphId
}: MemberFilterProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  // Fetch teams and members
  useEffect(() => {
    async function fetchTeamsAndMembers() {
      setLoading(true)
      try {
        // Fetch user's teams (filter by project if graphId provided)
        const teamsUrl = graphId
          ? `/api/v1/teams?graphId=${encodeURIComponent(graphId)}`
          : '/api/v1/teams'
        const teamsRes = await fetch(teamsUrl)
        if (!teamsRes.ok) {
          setLoading(false)
          return
        }
        const teamsData = await teamsRes.json()
        const userTeams: Team[] = teamsData.teams || []
        setTeams(userTeams)

        // Check if user is owner of any team (needed for owner-only features)
        const ownerTeams = userTeams.filter(t => t.role === 'owner')
        setIsOwner(ownerTeams.length > 0)

        // Fetch members from ALL teams (not just owned teams)
        // This allows seeing all team colleagues
        if (userTeams.length > 0) {
          const allMembers: TeamMember[] = []
          const seenUserIds = new Set<string>()

          for (const team of userTeams) {
            const membersRes = await fetch(`/api/v1/teams/${team.id}/members`)
            if (membersRes.ok) {
              const membersData = await membersRes.json()
              for (const member of membersData.members || []) {
                // Dedupe by user_id and skip current user
                if (!seenUserIds.has(member.user_id) && member.user_id !== currentUserId) {
                  seenUserIds.add(member.user_id)
                  allMembers.push(member)
                }
              }
            }
          }

          setMembers(allMembers)
        }
      } catch (err) {
        console.error('[MemberFilter] Error fetching teams:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamsAndMembers()
  }, [currentUserId, graphId])

  // Only show filter if user has teammates to filter by
  // Note: API enforces owner-only access for viewing other members' insights
  if (loading || members.length === 0) {
    return null
  }

  // Get display name for a member
  const getMemberDisplayName = (member: TeamMember): string => {
    if (member.user?.full_name) return member.user.full_name
    if (member.user?.github_username) return member.user.github_username
    if (member.user?.email) return member.user.email.split('@')[0]
    return 'Unknown'
  }

  // Get avatar for a member
  const getMemberAvatar = (member: TeamMember): string | null => {
    return member.user?.avatar_url || null
  }

  // Get currently selected member info
  const getSelectedLabel = (): string => {
    if (!selectedMemberId || selectedMemberId === currentUserId) {
      return 'Your Insights'
    }
    const member = members.find(m => m.user_id === selectedMemberId)
    return member ? getMemberDisplayName(member) : 'Your Insights'
  }

  const getSelectedAvatar = (): string | null => {
    if (!selectedMemberId || selectedMemberId === currentUserId) {
      return null
    }
    const member = members.find(m => m.user_id === selectedMemberId)
    return member ? getMemberAvatar(member) : null
  }

  const handleSelect = (memberId: string | null) => {
    if (memberId === null || memberId === currentUserId) {
      onMemberChange(null, currentUserEmail)
    } else {
      const member = members.find(m => m.user_id === memberId)
      onMemberChange(memberId, member?.user?.email || null)
    }
    setIsOpen(false)
  }

  const selectedAvatar = getSelectedAvatar()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-secondary/50 hover:bg-secondary transition-colors',
          'text-sm font-mono text-foreground',
          'border border-border'
        )}
      >
        {selectedAvatar ? (
          <img
            src={selectedAvatar}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <UserCircleIcon className="w-5 h-5 text-muted-foreground" />
        )}
        <span>{getSelectedLabel()}</span>
        <ChevronDownIcon className={clsx(
          'w-4 h-4 text-muted-foreground transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className={clsx(
            'absolute top-full left-0 mt-1 z-20',
            'min-w-[200px] max-h-[300px] overflow-y-auto',
            'bg-popover border border-border rounded-lg shadow-lg',
            'py-1'
          )}>
            {/* Current user option */}
            <button
              onClick={() => handleSelect(null)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-left',
                'hover:bg-secondary/50 transition-colors',
                'text-sm font-mono',
                (!selectedMemberId || selectedMemberId === currentUserId) && 'bg-primary/10 text-primary'
              )}
            >
              <UserCircleIcon className="w-5 h-5 text-muted-foreground" />
              <span>Your Insights</span>
            </button>

            {/* Team members section */}
            {members.length > 0 && (
              <>
                <div className="border-t border-border my-1" />
                <div className="px-3 py-1.5 text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" />
                  Team Members
                </div>
                {members.map((member) => {
                  const avatar = getMemberAvatar(member)
                  const name = getMemberDisplayName(member)
                  const isSelected = selectedMemberId === member.user_id

                  return (
                    <button
                      key={member.user_id}
                      onClick={() => handleSelect(member.user_id)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-left',
                        'hover:bg-secondary/50 transition-colors',
                        'text-sm font-mono',
                        isSelected && 'bg-primary/10 text-primary'
                      )}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <UserCircleIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="truncate">{name}</span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
