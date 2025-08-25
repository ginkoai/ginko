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
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
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
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Icon className="mr-3 h-6 w-6 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* Mission Statement */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Mission
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Improve Human-AI collaboration through actionable coaching insights and clear performance metrics.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/docs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Learn collaboration best practices →
          </Link>
        </div>
      </div>
    </aside>
  )
}