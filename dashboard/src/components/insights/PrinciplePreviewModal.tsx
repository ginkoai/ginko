/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-16
 * @tags: [insights, principles, modal, coaching]
 * @related: [InsightCard.tsx, dialog.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, dialog, heroicons]
 */
'use client'

import { LightBulbIcon, LinkIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Principle data structure for display in modal.
 * This matches the Principle node type schema (TASK-4).
 */
export interface Principle {
  id: string
  name: string
  theory: string // Markdown explanation of why this matters
  category?: 'standard' | 'custom'
  relatedPatterns?: string[]
  relatedADRs?: string[]
  source?: string // Where this principle came from (ADR, vendor, etc.)
}

interface PrinciplePreviewModalProps {
  principle: Principle | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal for displaying principle details when clicking recommendations.
 * Shows the principle name, theory (why it matters), and related patterns/ADRs.
 */
export function PrinciplePreviewModal({
  principle,
  open,
  onOpenChange
}: PrinciplePreviewModalProps) {
  const router = useRouter()

  if (!principle) return null

  const handleRelatedClick = (nodeId: string) => {
    // Navigate to Graph Explorer with the node selected
    router.push(`/dashboard/graph?view=node&node=${encodeURIComponent(nodeId)}`)
    onOpenChange(false) // Close the modal
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LightBulbIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>{principle.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge
                  className={clsx(
                    'text-xs',
                    principle.category === 'standard'
                      ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                      : 'bg-purple-500/20 text-purple-100 border border-purple-500/30'
                  )}
                >
                  {principle.category === 'standard' ? 'Standard' : 'Custom'}
                </Badge>
                {principle.source && (
                  <span className="text-muted-foreground text-xs">
                    Source: {principle.source}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {/* Theory Section - Why This Matters */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <BookOpenIcon className="h-4 w-4" />
                Why This Matters
              </h4>
              <div className="text-sm text-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
                {/* Render theory as text for now, could add markdown support later */}
                {principle.theory.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-2">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Related Patterns */}
            {principle.relatedPatterns && principle.relatedPatterns.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Related Patterns
                </h4>
                <div className="flex flex-wrap gap-2">
                  {principle.relatedPatterns.map((pattern, idx) => (
                    <Badge
                      key={idx}
                      onClick={() => handleRelatedClick(pattern)}
                      className="bg-purple-500/10 text-purple-400 border border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-colors"
                    >
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Related ADRs */}
            {principle.relatedADRs && principle.relatedADRs.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Related ADRs
                </h4>
                <div className="flex flex-wrap gap-2">
                  {principle.relatedADRs.map((adr, idx) => (
                    <Badge
                      key={idx}
                      onClick={() => handleRelatedClick(adr)}
                      className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono cursor-pointer hover:bg-cyan-500/20 transition-colors"
                    >
                      {adr}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Map recommendation text to a principle for display.
 * In the full implementation, this would fetch from the graph API.
 */
export function mapRecommendationToPrinciple(recommendation: string): Principle | null {
  // Placeholder implementation - maps common recommendations to principles
  // This will be enhanced when TASK-4 (Principle node type) is complete
  const principleMap: Record<string, Principle> = {
    'event-based context loading': {
      id: 'PRINCIPLE-003',
      name: 'Event-Based Context Loading',
      theory: 'Event-based context loading reduces token usage by up to 100% compared to strategic loading. Instead of synthesizing all historical context at session start, we load only the recent events that matter.\n\nThis approach achieves sub-second startup times and dramatically reduces API costs while maintaining session continuity.',
      category: 'standard',
      relatedPatterns: ['cursor-based-pagination', 'event-streaming'],
      relatedADRs: ['ADR-043'],
      source: 'ADR-043'
    },
    'defensive logging': {
      id: 'PRINCIPLE-002',
      name: 'Defensive Logging at Low Pressure',
      theory: 'Log insights when context pressure is low (20-80%) rather than waiting until session end. This ensures high-quality handoffs even when called at 95%+ pressure.\n\nThe "Fresh Session Test" standard: write for an AI with ZERO context about your session.',
      category: 'standard',
      relatedPatterns: ['context-pressure-monitoring'],
      relatedADRs: ['ADR-033'],
      source: 'ADR-033'
    },
    'ai-optimized file discovery': {
      id: 'PRINCIPLE-001',
      name: 'AI-Optimized File Discovery',
      theory: 'Standardized frontmatter enables 70% faster context discovery. Using `head -12 filename.ts` provides instant file context in 0.1 seconds.\n\nThis dramatically improves AI-assisted development by making file purposes immediately clear.',
      category: 'standard',
      relatedPatterns: ['frontmatter-pattern'],
      relatedADRs: ['ADR-002'],
      source: 'ADR-002'
    },
    'session archives': {
      id: 'PRINCIPLE-006',
      name: 'Session Continuity',
      theory: 'Keep session archives organized for fast retrieval. Archived sessions provide historical context that enables better handoffs and pattern recognition.\n\nWell-organized archives are essential for team collaboration and knowledge transfer.',
      category: 'standard',
      relatedPatterns: ['session-archiving'],
      relatedADRs: [],
      source: 'Ginko Core'
    },
    'adr': {
      id: 'PRINCIPLE-004',
      name: 'Architecture Decision Records',
      theory: 'ADRs (Architecture Decision Records) document important architectural decisions along with their context and consequences. Referencing ADRs in commits and logs connects daily work to architectural principles.\n\nWhen work aligns with ADRs, decisions are traceable and consistent. When ADRs are rarely referenced, teams may drift from intended architecture without realizing it.\n\nAim to reference relevant ADRs in at least 5% of logged events and commits.',
      category: 'standard',
      relatedPatterns: ['adr-workflow', 'documentation-as-code'],
      relatedADRs: ['ADR-002', 'ADR-033'],
      source: 'Michael Nygard / Thoughtworks'
    },
    'pattern': {
      id: 'PRINCIPLE-005',
      name: 'Pattern Documentation',
      theory: 'Patterns capture proven solutions to recurring problems. A growing pattern library prevents reinventing the wheel and enables knowledge transfer between team members and AI assistants.\n\nWell-documented patterns include: the problem context, the solution approach, code examples, and when NOT to use the pattern.\n\nEach documented pattern saves future time by providing instant context for common challenges.',
      category: 'standard',
      relatedPatterns: ['pattern-catalog', 'knowledge-management'],
      relatedADRs: [],
      source: 'Gang of Four / Domain-Driven Design'
    },
    'recurring solutions': {
      id: 'PRINCIPLE-005',
      name: 'Pattern Documentation',
      theory: 'Patterns capture proven solutions to recurring problems. A growing pattern library prevents reinventing the wheel and enables knowledge transfer between team members and AI assistants.\n\nWell-documented patterns include: the problem context, the solution approach, code examples, and when NOT to use the pattern.\n\nEach documented pattern saves future time by providing instant context for common challenges.',
      category: 'standard',
      relatedPatterns: ['pattern-catalog', 'knowledge-management'],
      relatedADRs: [],
      source: 'Gang of Four / Domain-Driven Design'
    },
    'commit messages': {
      id: 'PRINCIPLE-007',
      name: 'Atomic Commits',
      theory: 'Atomic commits contain a single logical change with a clear message explaining WHY the change was made. Smaller commits are easier to review, revert, and understand.\n\nAim for commits under 500 lines with messages that explain intent, not just what changed. Reference related ADRs and tasks in commit messages for traceability.',
      category: 'standard',
      relatedPatterns: ['git-workflow'],
      relatedADRs: [],
      source: 'Git Best Practices'
    },
    'ginko log': {
      id: 'PRINCIPLE-002',
      name: 'Defensive Logging at Low Pressure',
      theory: 'Log insights when context pressure is low (20-80%) rather than waiting until session end. This ensures high-quality handoffs even when called at 95%+ pressure.\n\nThe "Fresh Session Test" standard: write for an AI with ZERO context about your session.',
      category: 'standard',
      relatedPatterns: ['context-pressure-monitoring'],
      relatedADRs: ['ADR-033'],
      source: 'ADR-033'
    },
    'handoff': {
      id: 'PRINCIPLE-008',
      name: 'Session Handoff',
      theory: 'Session handoffs preserve context between work sessions. A good handoff summarizes what was accomplished, what remains to do, and any important decisions or blockers.\n\nHandoffs enable warm starts instead of cold starts, dramatically reducing ramp-up time for the next session. Running `ginko handoff` before ending a session ensures continuity.',
      category: 'standard',
      relatedPatterns: ['session-management', 'context-preservation'],
      relatedADRs: ['ADR-033'],
      source: 'Ginko Core'
    }
  }

  // Find matching principle by checking if recommendation contains key phrases
  const lowerRec = recommendation.toLowerCase()
  for (const [key, principle] of Object.entries(principleMap)) {
    if (lowerRec.includes(key)) {
      return principle
    }
  }

  return null
}
