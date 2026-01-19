/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-19
 * @tags: [ui, button, hero, landing-page, animation, cta]
 * @related: [hero-section.tsx, button.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, clsx]
 */
'use client'

import { forwardRef, useRef, useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface HeroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: string
}

export const HeroButton = forwardRef<HTMLButtonElement, HeroButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false)
    const [displayText, setDisplayText] = useState(children)
    const textRef = useRef<HTMLSpanElement>(null)
    const animationRef = useRef<NodeJS.Timeout | null>(null)

    // Typewriter effect from center outward
    useEffect(() => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }

      if (isHovered) {
        const text = children.toUpperCase()
        const mid = Math.floor(text.length / 2)
        let left = mid
        let right = mid
        let currentText = ''

        // Start with empty/spaces
        setDisplayText('\u00A0'.repeat(text.length))

        animationRef.current = setInterval(() => {
          if (left >= 0 || right < text.length) {
            const chars = text.split('')
            const result = chars.map((_, i) => {
              if (i >= left && i <= right) {
                return chars[i]
              }
              return '\u00A0'
            }).join('')

            setDisplayText(result)

            if (left > 0) left--
            if (right < text.length - 1) right++
          } else {
            if (animationRef.current) clearInterval(animationRef.current)
          }
        }, 30)
      } else {
        setDisplayText(children.toUpperCase())
      }

      return () => {
        if (animationRef.current) clearInterval(animationRef.current)
      }
    }, [isHovered, children])

    const isPrimary = variant === 'primary'

    return (
      <button
        ref={ref}
        className={clsx(
          // Base styles - rectangular with rounded corners
          'relative inline-flex items-center justify-between gap-4',
          'font-mono font-semibold uppercase tracking-wide',
          'rounded-lg overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'min-w-[200px] h-14 pl-6 pr-2',
          // Variant styles
          isPrimary
            ? 'bg-[#c1f500] text-black focus-visible:ring-[#c1f500]'
            : 'bg-white text-black border-2 border-black/10 focus-visible:ring-black',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Text with typewriter effect */}
        <span
          ref={textRef}
          className="relative z-10 text-sm whitespace-nowrap"
        >
          {displayText}
        </span>

        {/* Arrow container - small square on right */}
        <span
          className={clsx(
            'relative flex items-center justify-center',
            'w-10 h-10 rounded-md overflow-hidden flex-shrink-0',
            isPrimary ? 'bg-white' : 'bg-[#d85a4a]'
          )}
        >
          {/* Default arrow - slides out on hover */}
          <svg
            className={clsx(
              'w-5 h-5 absolute transition-all duration-300 ease-out',
              isPrimary ? 'text-[#c1f500]' : 'text-white',
              isHovered ? 'translate-x-8 opacity-0' : 'translate-x-0 opacity-100'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>

          {/* Hover arrow - slides in from left */}
          <svg
            className={clsx(
              'w-5 h-5 absolute transition-all duration-300 ease-out',
              isPrimary ? 'text-[#c1f500]' : 'text-white',
              isHovered ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </button>
    )
  }
)

HeroButton.displayName = 'HeroButton'
