/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [help, tour, onboarding, keyboard-shortcuts]
 * @related: [OnboardingOverlay.tsx, useOnboarding.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, Compass, Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface HelpButtonProps {
  /** Callback to start the onboarding tour */
  onStartTour: () => void;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function HelpButton({ onStartTour, className }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleStartTour = () => {
    setIsOpen(false);
    onStartTour();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Help Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'bg-card/80 backdrop-blur border border-border',
          'hover:bg-white/10 transition-colors',
          'shadow-lg',
          isOpen && 'bg-white/10'
        )}
        aria-label="Help menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            'absolute bottom-full right-0 mb-2',
            'w-56 py-2',
            'bg-card border border-border rounded-xl shadow-2xl',
            'animate-in fade-in slide-in-from-bottom-2 duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Take a Tour */}
          <button
            onClick={handleStartTour}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5',
              'text-sm text-foreground hover:bg-white/5 transition-colors'
            )}
            role="menuitem"
          >
            <Compass className="w-4 h-4 text-ginko-400" />
            <span>Take a Tour</span>
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => {
              setIsOpen(false);
              // Could trigger keyboard shortcuts modal here
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5',
              'text-sm text-foreground hover:bg-white/5 transition-colors'
            )}
            role="menuitem"
          >
            <Keyboard className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 flex items-center justify-between">
              <span>Keyboard Shortcuts</span>
              <kbd className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                ?
              </kbd>
            </div>
          </button>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          {/* Helpful Tips */}
          <div className="px-4 py-2 text-xs text-muted-foreground">
            <p className="mb-1">Quick tips:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Press / to search</li>
              <li>Arrow keys to navigate tree</li>
              <li>Esc to close panels</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpButton;
