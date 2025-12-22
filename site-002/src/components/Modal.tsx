/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-21
 * @tags: modal, dialog, accessibility, focus-trap
 * @related: SectionCard.tsx
 * @priority: high
 * @complexity: high
 * @dependencies: react
 */

import { useEffect, useRef, useCallback } from 'react'
import { Section } from '../data/sections'
import styles from './Modal.module.css'

const SIGNUP_URL = 'https://app.ginkoai.com/signup'

interface ModalProps {
  section: Section | null
  onClose: () => void
}

export function Modal({ section, onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (section) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    }
  }, [section])

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!section || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the close button when modal opens
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Restore focus to previously focused element
      previouslyFocusedRef.current?.focus()
    }
  }, [section, onClose])

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  if (!section) return null

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <span aria-hidden="true">×</span>
        </button>

        {/* Media Placeholder */}
        <div className={styles.mediaPlaceholder} aria-hidden="true">
          <svg
            viewBox="0 0 100 100"
            className={styles.placeholderIcon}
            aria-hidden="true"
          >
            <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" />
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className={styles.placeholderText}>Media Coming Soon</span>
        </div>

        {/* Modal Content */}
        <div className={styles.content}>
          <h2 id="modal-title" className={styles.title}>
            {section.modalContent.header}
          </h2>
          <p id="modal-description" className={styles.description}>
            {section.modalContent.description}
          </p>
        </div>

        {/* CTA Button */}
        <a
          href={SIGNUP_URL}
          className={styles.ctaButton}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Started
        </a>
      </div>
    </div>
  )
}
