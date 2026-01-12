/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-18
 * @tags: [dashboard, navigation, header, tabs, ginko-branding]
 * @related: [dashboard-tabs.tsx, layout.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next, supabase, heroicons]
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSupabase } from '@/components/providers'
import ginkoLogo from '@/ginko-logo-green.png'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
import { DashboardTabs } from './dashboard-tabs'
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const [loading, setLoading] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error('Error signing out')
    } finally {
      setLoading(false)
    }
  }

  const userMenuItems = [
    {
      label: 'Notifications',
      icon: BellIcon,
      href: '/dashboard/notifications'
    },
    {
      label: 'Profile',
      icon: UserCircleIcon,
      href: '/dashboard/settings#account'
    },
    {
      label: 'Settings',
      icon: Cog6ToothIcon,
      href: '/dashboard/settings'
    },
    {
      label: 'Sign Out',
      icon: ArrowRightOnRectangleIcon,
      onClick: handleSignOut,
      loading
    }
  ]

  return (
    <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      {/* Top row: Logo and user actions */}
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo - Ginko branding with green accent */}
        <Link
          href="/dashboard"
          className="hover:opacity-80 transition-opacity"
        >
          <Image
            src={ginkoLogo}
            alt="ginko"
            height={36}
            className="w-auto"
            priority
          />
        </Link>

        {/* Center - Navigation Tabs (hidden on mobile) */}
        <div className="hidden sm:block">
          <DashboardTabs />
        </div>

        {/* Right side */}
        <div className="flex items-center">
          {/* User Menu with notification badge */}
          <Dropdown
            trigger={
              <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground p-1 sm:p-2">
                <div className="relative">
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    alt={user.user_metadata?.full_name || user.email || ''}
                    fallback={(user.user_metadata?.full_name || user.email || '').charAt(0).toUpperCase()}
                    className="h-8 w-8 border border-border"
                  />
                  {/* Notification badge - top right of avatar */}
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-mono">
                    3
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </Button>
            }
            items={userMenuItems}
          />
        </div>
      </div>

      {/* Bottom row: Navigation tabs (mobile only) */}
      <div className="sm:hidden px-2 pb-2">
        <DashboardTabs />
      </div>
    </nav>
  )
}
