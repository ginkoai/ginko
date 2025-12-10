'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import {
  Cog6ToothIcon as Cog6ToothIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  UserGroupIcon as UserGroupIconSolid
} from '@heroicons/react/24/solid'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: UserGroupIcon,
    iconActive: UserGroupIconSolid,
    description: 'Collaboration insights and session analytics'
  },
  {
    name: 'Docs',
    href: '/dashboard/docs',
    icon: DocumentTextIcon,
    iconActive: DocumentTextIconSolid,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    iconActive: Cog6ToothIconSolid,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border overflow-y-auto">
      <nav className="p-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = isActive ? item.iconActive : item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="mr-3 h-6 w-6 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Mission Statement */}
      <div className="p-6 border-t border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mission
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Improve Human-AI collaboration through actionable coaching insights and clear performance metrics.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/docs"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Learn collaboration best practices →
          </Link>
        </div>
      </div>
    </aside>
  )
}
