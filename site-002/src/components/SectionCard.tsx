/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-21
 * @tags: card, section, typography, cta
 * @related: Modal.tsx, sections.ts
 * @priority: high
 * @complexity: medium
 */

import { Section, getCtaColor } from '../data/sections'
import styles from './SectionCard.module.css'

interface SectionCardProps {
  section: Section
  onOpenModal: (section: Section) => void
}

export function SectionCard({ section, onOpenModal }: SectionCardProps) {
  const ctaColor = getCtaColor(section.id - 1)
  const paddedIndex = section.id.toString().padStart(2, '0')

  return (
    <article className={styles.card} aria-labelledby={`section-${section.id}-title`}>
      <div className={styles.content}>
        {/* Left Column: Index + CTA */}
        <div className={styles.leftColumn}>
          {/* Index Numeral */}
          <span className={styles.index} aria-hidden="true">
            {paddedIndex}
          </span>

          {/* CTA Button - Large square beneath numeral */}
          <button
            className={`${styles.cta} ${styles[`cta--${ctaColor}`]}`}
            onClick={() => onOpenModal(section)}
            aria-label={`Learn more about ${section.title}`}
          >
            <span className={styles.ctaText}>Learn More</span>
          </button>
        </div>

        {/* Right Column: Header + Text */}
        <div className={styles.rightColumn}>
          {/* Header */}
          <h2 id={`section-${section.id}-title`} className={styles.title}>
            {section.title}
          </h2>

          {/* Problem Text */}
          <div className={styles.textBlock}>
            <h3 className={styles.textLabel}>The Challenge</h3>
            <p className={styles.text}>{section.problemText}</p>
          </div>

          {/* Solution Text */}
          <div className={styles.textBlock}>
            <h3 className={styles.textLabel}>The Ginko Way</h3>
            <p className={styles.text}>{section.solutionText}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
