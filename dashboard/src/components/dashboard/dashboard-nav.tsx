/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-17
 * @tags: [dashboard, navigation, header, tabs, ginko-branding, mobile-nav]
 * @related: [dashboard-tabs.tsx, layout.tsx, MobileNavToggle.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next, supabase, heroicons, lucide-react]
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSupabase } from '@/components/providers'
import ginkoLogo from '@/ginko-logo-green.png'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Dropdown } from '@/components/ui/dropdown'
import { DashboardTabs } from './dashboard-tabs'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ChartBarIcon,
  MapIcon,
  LightBulbIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import {
  ChartBarIcon as ChartBarIconSolid,
  MapIcon as MapIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  CircleStackIcon as CircleStackIconSolid
} from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'

// Navigation items for mobile menu (matches dashboard-tabs.tsx)
const mobileNavItems = [
  {
    name: 'Focus',
    href: '/dashboard',
    icon: ChartBarIcon,
    iconActive: ChartBarIconSolid,
    color: 'focus',
  },
  {
    name: 'Roadmap',
    href: '/dashboard/roadmap',
    icon: MapIcon,
    iconActive: MapIconSolid,
    color: 'roadmap',
  },
  {
    name: 'Insights',
    href: '/dashboard/insights',
    icon: LightBulbIcon,
    iconActive: LightBulbIconSolid,
    color: 'insights',
  },
  {
    name: 'Graph',
    href: '/dashboard/graph',
    icon: CircleStackIcon,
    iconActive: CircleStackIconSolid,
    color: 'graph',
  },
]

const mobileColorStyles = {
  focus: {
    active: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
    hover: 'hover:bg-cyan-500/10 hover:text-cyan-400',
  },
  roadmap: {
    active: 'bg-primary/20 text-primary border-primary/50',
    hover: 'hover:bg-primary/10 hover:text-primary',
  },
  insights: {
    active: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    hover: 'hover:bg-amber-500/10 hover:text-amber-400',
  },
  graph: {
    active: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    hover: 'hover:bg-purple-500/10 hover:text-purple-400',
  },
}

interface DashboardNavProps {
  user: User
  /** Optional notification count - if undefined or 0, badge is hidden */
  notificationCount?: number
}

export function DashboardNav({ user, notificationCount }: DashboardNavProps) {
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

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
    <>
    <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      {/* Top row: Logo and user actions */}
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left side: Hamburger menu (mobile) + Logo */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              // Base styles - 44px minimum touch target
              'flex items-center justify-center',
              'w-11 h-11 min-w-[44px] min-h-[44px]',
              // Visual styling
              'rounded-lg',
              'bg-card border border-border',
              'text-foreground',
              // Hover/focus states
              'hover:bg-white/5 active:bg-white/10',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-ginko-500/50',
              // Only show on mobile
              'sm:hidden'
            )}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-overlay"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

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
        </div>

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
                  {/* Notification badge - top right of avatar (only shown when count > 0) */}
                  {notificationCount && notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 z-10 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-mono">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
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

    </nav>

    {/* Mobile menu overlay */}
    {mobileMenuOpen && (
      <div
        id="mobile-nav-overlay"
        className="fixed inset-0 z-40 sm:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Menu panel */}
        <div className="fixed top-14 left-0 right-0 bg-card border-b border-border shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="p-4 space-y-2">
            {mobileNavItems.map((item) => {
              // Exact match for Focus (/dashboard), prefix match for others
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              const Icon = isActive ? item.iconActive : item.icon
              const colors = mobileColorStyles[item.color as keyof typeof mobileColorStyles]

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all border border-transparent',
                    // Larger touch targets for mobile
                    'min-h-[48px]',
                    isActive
                      ? colors.active
                      : `text-muted-foreground ${colors.hover}`
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-mono">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    )}
    </>
  )
}
