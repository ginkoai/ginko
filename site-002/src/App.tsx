/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-21
 * @tags: app, layout, main
 * @related: NavHeader.tsx, SectionCard.tsx, Modal.tsx
 * @priority: critical
 * @complexity: medium
 */

import { useState, useCallback } from 'react'
import { NavHeader, SectionCard, Modal } from './components'
import { sections, Section } from './data/sections'
import './App.css'

export default function App() {
  const [activeSection, setActiveSection] = useState<Section | null>(null)

  const handleOpenModal = useCallback((section: Section) => {
    setActiveSection(section)
  }, [])

  const handleCloseModal = useCallback(() => {
    setActiveSection(null)
  }, [])

  return (
    <>
      <NavHeader />

      <main className="main-content">
        <div className="container">
          {/* Hero/Intro Section */}
          <header className="hero">
            <h1 className="hero-title">Focus Without Anxiety</h1>
            <p className="hero-subtitle">
              AI-assisted development that works with you, not against your flow.
              Ginko brings intelligent context management to your coding sessions.
            </p>
          </header>

          {/* Section Cards Grid */}
          <div className="cards-grid">
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onOpenModal={handleOpenModal}
              />
            ))}
          </div>

          {/* Footer */}
          <footer className="footer">
            <p className="footer-text">
              Built for developers who value focus.
            </p>
            <p className="footer-copyright">
              © {new Date().getFullYear()} Ginko. All rights reserved.
            </p>
          </footer>
        </div>
      </main>

      {/* Modal */}
      <Modal section={activeSection} onClose={handleCloseModal} />
    </>
  )
}
