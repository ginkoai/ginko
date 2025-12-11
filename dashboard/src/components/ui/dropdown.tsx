'use client'

import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'

interface DropdownItem {
  label: string
  icon?: React.ComponentType<any>
  href?: string
  onClick?: () => void
  loading?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (item: DropdownItem) => {
    if (item.onClick) {
      item.onClick()
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div className={clsx(
          'absolute top-full mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50',
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          <div className="py-1">
            {items.map((item, index) => {
              const Icon = item.icon

              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className="flex items-center px-4 py-2.5 text-sm font-mono text-foreground hover:bg-secondary hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {Icon && <Icon className="mr-3 h-4 w-4" />}
                    {item.label}
                  </Link>
                )
              }

              return (
                <button
                  key={index}
                  className="flex w-full items-center px-4 py-2.5 text-sm font-mono text-foreground hover:bg-secondary hover:text-primary transition-colors disabled:opacity-50"
                  onClick={() => handleItemClick(item)}
                  disabled={item.loading}
                >
                  {Icon && <Icon className="mr-3 h-4 w-4" />}
                  {item.label}
                  {item.loading && (
                    <svg className="animate-spin ml-auto h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}