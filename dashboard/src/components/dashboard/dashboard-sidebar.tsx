/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [dashboard, sidebar, navigation, ginko-branding]
 * @related: [dashboard-nav.tsx, layout.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next, heroicons]
 */
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import {
  Cog6ToothIcon as Cog6ToothIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CircleStackIcon as CircleStackIconSolid
} from '@heroicons/react/24/solid'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: ChartBarIcon,
    iconActive: ChartBarIconSolid,
    description: 'Collaboration insights'
  },
  {
    name: 'Graph',
    href: '/dashboard/graph',
    icon: CircleStackIcon,
    iconActive: CircleStackIconSolid,
    description: 'Knowledge graph explorer'
  },
  {
    name: 'Docs',
    href: '/dashboard/docs',
    icon: DocumentTextIcon,
    iconActive: DocumentTextIconSolid,
    description: 'Best practices'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    iconActive: Cog6ToothIconSolid,
    description: 'Configuration'
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border overflow-y-auto flex flex-col">
      {/* Navigation */}
      <nav className="p-4 space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = isActive ? item.iconActive : item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className={clsx(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive ? 'text-primary' : ''
              )} />
              <span className="font-mono">{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mission Statement - Bottom */}
      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-lg bg-secondary/50">
          <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider mb-2">
            Mission
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Improve Human-AI collaboration through actionable coaching insights.
          </p>
          <Link
            href="/dashboard/docs"
            className="inline-flex items-center mt-3 text-xs text-primary hover:text-primary/80 font-mono font-medium"
          >
            Learn best practices
            <span className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
