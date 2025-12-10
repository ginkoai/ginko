'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
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
      label: 'Profile',
      icon: UserCircleIcon,
      href: '/dashboard/profile'
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
    <nav className="bg-card shadow-sm border-b border-border h-16">
      <div className="px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="font-mono text-3xl text-primary hover:text-primary/80 transition-colors">
          ginko
        </Link>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User Menu */}
          <Dropdown
            trigger={
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  alt={user.user_metadata?.full_name || user.email || ''}
                  fallback={(user.user_metadata?.full_name || user.email || '').charAt(0).toUpperCase()}
                  className="h-8 w-8"
                />
                <span className="hidden md:block text-sm font-medium text-foreground">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </Button>
            }
            items={userMenuItems}
          />
        </div>
      </div>
    </nav>
  )
}
