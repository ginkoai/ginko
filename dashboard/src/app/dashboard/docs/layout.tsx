'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  BookOpenIcon,
  CommandLineIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import {
  BookOpenIcon as BookOpenIconSolid,
  CommandLineIcon as CommandLineIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleIconSolid
} from '@heroicons/react/24/solid'

const docNavigation = [
  {
    name: 'Getting Started',
    href: '/dashboard/docs',
    icon: BookOpenIcon,
    iconActive: BookOpenIconSolid,
  },
  {
    name: 'API Reference',
    href: '/dashboard/docs/api-reference',
    icon: CommandLineIcon,
    iconActive: CommandLineIconSolid,
  },
  {
    name: 'Troubleshooting',
    href: '/dashboard/docs/troubleshooting',
    icon: WrenchScrewdriverIcon,
    iconActive: WrenchScrewdriverIconSolid,
  },
]

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full -mx-6 -my-8">
      {/* Docs Sidebar */}
      <div className="w-64 bg-card border-r border-border overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Documentation</h2>
          <nav className="space-y-2">
            {docNavigation.map((item) => {
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
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Quick Links */}
        <div className="px-6 py-4 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Links
          </h3>
          <div className="space-y-2">
            <a
              href="https://docs.anthropic.com/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:text-primary/80"
            >
              Claude Code Docs
            </a>
            <a
              href="https://github.com/ginko-ai/ginko"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:text-primary/80"
            >
              GitHub Repository
            </a>
            <a
              href="https://github.com/ginko-ai/ginko/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-primary hover:text-primary/80"
            >
              Report Issues
            </a>
            <Link
              href="/dashboard/settings"
              className="block text-sm text-primary hover:text-primary/80"
            >
              API Key Settings
            </Link>
          </div>
        </div>

        {/* Support Box */}
        <div className="px-6 py-4 border-t border-border">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start">
              <QuestionMarkCircleIcon className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Need Help?</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Can&apos;t find what you&apos;re looking for?
                </p>
                <a
                  href="mailto:support@ginko.ai"
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Contact Support →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
