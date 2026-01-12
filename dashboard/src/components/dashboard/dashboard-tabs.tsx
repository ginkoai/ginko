/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-18
 * @tags: [dashboard, navigation, tabs, ginko-branding]
 * @related: [dashboard-nav.tsx, layout.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, next, heroicons]
 */
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  ChartBarIcon,
  CircleStackIcon,
  LightBulbIcon,
  MapIcon
} from '@heroicons/react/24/outline'
import {
  ChartBarIcon as ChartBarIconSolid,
  CircleStackIcon as CircleStackIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  MapIcon as MapIconSolid
} from '@heroicons/react/24/solid'

const navigation = [
  {
    name: 'Focus',
    href: '/dashboard',
    icon: ChartBarIcon,
    iconActive: ChartBarIconSolid,
    color: 'focus', // cyan
  },
  {
    name: 'Roadmap',
    href: '/dashboard/roadmap',
    icon: MapIcon,
    iconActive: MapIconSolid,
    color: 'roadmap', // ginko green
  },
  {
    name: 'Insights',
    href: '/dashboard/insights',
    icon: LightBulbIcon,
    iconActive: LightBulbIconSolid,
    color: 'insights', // amber/yellow
  },
  {
    name: 'Graph',
    href: '/dashboard/graph',
    icon: CircleStackIcon,
    iconActive: CircleStackIconSolid,
    color: 'graph', // purple
  },
]

const colorStyles = {
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

export function DashboardTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg border border-border overflow-x-auto scrollbar-hide">
      {navigation.map((item) => {
        // Exact match for Focus (/dashboard), prefix match for others
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
        const Icon = isActive ? item.iconActive : item.icon
        const colors = colorStyles[item.color as keyof typeof colorStyles]

        return (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all border border-transparent',
              isActive
                ? colors.active
                : `text-muted-foreground ${colors.hover}`
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="font-mono whitespace-nowrap">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
