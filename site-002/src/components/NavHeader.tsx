/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-21
 * @tags: navigation, header, fixed, npm-cta
 * @related: App.tsx
 * @priority: high
 * @complexity: low
 */

import { useState, useCallback } from 'react'
import styles from './NavHeader.module.css'

const NPM_COMMAND = 'npm install -g @ginkoai/cli'
const DASHBOARD_URL = 'https://app.ginkoai.com'

export function NavHeader() {
  const [copied, setCopied] = useState(false)

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(NPM_COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = NPM_COMMAND
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  return (
    <header className={styles.header} role="banner">
      <nav className={styles.nav} aria-label="Main navigation">
        {/* Logo */}
        <a href="/" className={styles.logoLink} aria-label="Ginko home">
          <img
            src="/ginko-logo-green.png"
            alt="Ginko"
            className={styles.logo}
            width="120"
            height="45"
          />
        </a>

        {/* NPM Install CTA */}
        <button
          className={styles.npmCta}
          onClick={handleCopyCommand}
          aria-label={copied ? 'Copied!' : 'Copy npm install command'}
        >
          <code className={styles.npmCode}>{NPM_COMMAND}</code>
          <span className={styles.copyIcon} aria-hidden="true">
            {copied ? '✓' : '⧉'}
          </span>
          <span className="sr-only">
            {copied ? 'Copied to clipboard' : 'Click to copy'}
          </span>
        </button>

        {/* Sign In Link */}
        <a
          href={DASHBOARD_URL}
          className={styles.signIn}
          target="_blank"
          rel="noopener noreferrer"
        >
          Sign In
        </a>
      </nav>
    </header>
  )
}
