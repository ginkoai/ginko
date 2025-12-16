/**
 * @fileType: data
 * @status: current
 * @updated: 2025-12-16
 * @tags: [principles, standards, coaching, best-practices]
 * @related: [PrinciplePreviewModal.tsx, node-schemas.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Standard principles extracted from ADRs, CLAUDE.md, and vendor best practices.
 * These are marked as 'standard' type and are read-only in the dashboard.
 */
export interface StandardPrinciple {
  principle_id: string;
  name: string;
  theory: string;
  type: 'standard';
  status: 'active' | 'deprecated';
  source: string;
  related_patterns?: string[];
  related_adrs?: string[];
  version: string;
}

export const STANDARD_PRINCIPLES: StandardPrinciple[] = [
  // ==========================================================================
  // Ginko Core Principles (from CLAUDE.md and ADRs)
  // ==========================================================================
  {
    principle_id: 'PRINCIPLE-001',
    name: 'AI-Optimized File Discovery',
    theory: `Standardized frontmatter enables **70% faster** context discovery for AI assistants.

Using \`head -12 filename.ts\` provides instant file context in 0.1 seconds, compared to minutes of reading through entire files.

**Why it matters:**
- AI assistants can quickly understand file purpose and dependencies
- Reduces token usage by avoiding full file reads
- Enables smart search by functionality, not just filename
- Improves team velocity through consistent documentation

**Implementation:**
Every TypeScript/JavaScript file should include a frontmatter block with:
- @fileType: component|page|api-route|hook|utility|provider|model|config|command
- @status: current|deprecated|experimental
- @tags: relevant keywords for search
- @related: connected files
- @complexity: low|medium|high`,
    type: 'standard',
    status: 'active',
    source: 'ADR-002',
    related_patterns: ['frontmatter-pattern'],
    related_adrs: ['ADR-002'],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-002',
    name: 'Defensive Logging at Low Pressure',
    theory: `Log insights when context pressure is low (20-80%) rather than waiting until session end.

**The Problem:**
When context pressure exceeds 95%, the quality of handoffs and documentation degrades significantly. AI assistants struggle to capture nuanced details under high pressure.

**The Solution:**
Continuous logging throughout the session captures insights at optimal quality:
- Trigger logging after fixes, features, decisions, insights, achievements
- Use the "Fresh Session Test": write for an AI with ZERO context
- Include WHAT + WHY + HOW in every log entry

**Quality Standard:**
A fresh AI reading your log should understand:
1. WHAT happened (the action or discovery)
2. WHY it matters (impact and context)
3. HOW it was done (key details and files)

This ensures high-quality handoffs even when called at 95%+ pressure.`,
    type: 'standard',
    status: 'active',
    source: 'ADR-033',
    related_patterns: ['context-pressure-monitoring', 'session-logging'],
    related_adrs: ['ADR-033'],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-003',
    name: 'Event-Based Context Loading',
    theory: `Load context via event streaming instead of synthesizing all historical context at session start.

**The Impact:**
- Token reduction: 93,000 → 0-500 tokens (100% reduction)
- Session start time: 5-10 minutes → <30 seconds (20x faster)
- Cost savings: Dramatically reduced API costs

**How it works:**
1. Maintain a cursor pointing to the last processed event
2. On session start, fetch only events since cursor
3. Load only relevant recent context
4. Avoid redundant synthesis of known history

**Key Implementation:**
- Session cursor stored in \`.ginko/sessions/[user]/cursors.json\`
- Event stream in \`.ginko/sessions/[user]/current-events.jsonl\`
- Graceful fallback to strategic loading if events unavailable`,
    type: 'standard',
    status: 'active',
    source: 'ADR-043',
    related_patterns: ['cursor-based-pagination', 'event-streaming'],
    related_adrs: ['ADR-043'],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-004',
    name: 'Git as Source of Truth',
    theory: `Use Git as the canonical source of truth for all project artifacts and session state.

**Why Git-native:**
- Works offline without external dependencies
- Natural versioning and history
- Familiar to all developers
- Easy backup and sync
- Audit trail built-in

**What to track in Git:**
- Session logs and handoffs
- Sprint files and progress
- Architecture decisions (ADRs)
- Project charter and goals
- Pattern and gotcha documentation

**What NOT to track:**
- Temporary files
- Secrets and credentials
- Generated artifacts
- Large binary files`,
    type: 'standard',
    status: 'active',
    source: 'Ginko Core',
    related_patterns: ['git-native-workflow'],
    related_adrs: [],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-005',
    name: 'Sprint Progress Tracking',
    theory: `Maintain continuous visibility into sprint progress through structured markdown files.

**Location:** \`docs/sprints/SPRINT-[date]-[name].md\`

**Update Triggers:**
- After completing any task (mark complete)
- When starting new work (mark in-progress)
- When discovering blockers (document immediately)
- After achieving milestones

**Checkbox States:**
- \`[ ]\` - Todo (not started)
- \`[@]\` - In progress (currently working)
- \`[Z]\` - Paused/sleeping (temporarily on hold)
- \`[x]\` - Complete

**Progress Formula:**
\`Progress % = (Completed Tasks / Total Tasks) × 100\`

This enables both human and AI collaborators to maintain context about project state.`,
    type: 'standard',
    status: 'active',
    source: 'Ginko Core',
    related_patterns: ['sprint-file-pattern'],
    related_adrs: [],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-006',
    name: 'Session Continuity',
    theory: `Maintain session context across handoffs and interruptions to minimize ramp-up time.

**Key Elements:**
1. **Session Logs:** Chronological record of work done
2. **Event Stream:** Structured events for machine processing
3. **Session Archives:** Historical sessions for reference
4. **Handoff Summaries:** Synthesized context for transitions

**Handoff Quality:**
A good handoff enables the next collaborator to:
- Understand what was accomplished
- Know what was in progress
- See what's blocked
- Identify next steps

**Archive Management:**
- Archive sessions on explicit handoff
- Retain for pattern recognition and learning
- Enable historical context retrieval`,
    type: 'standard',
    status: 'active',
    source: 'Ginko Core',
    related_patterns: ['session-archiving', 'handoff-pattern'],
    related_adrs: ['ADR-033'],
    version: '1.0.0'
  },

  // ==========================================================================
  // AI Collaboration Principles (from vendor best practices)
  // ==========================================================================
  {
    principle_id: 'PRINCIPLE-007',
    name: 'Explicit Context Over Implicit',
    theory: `Provide explicit context rather than relying on AI inference.

**The Problem:**
AI assistants perform better with clear, explicit context than when forced to infer from ambiguous situations.

**Best Practices:**
- State goals explicitly at session start
- Provide relevant background information
- Specify constraints and requirements
- Share examples of desired outcomes

**Anti-patterns to avoid:**
- Assuming AI remembers past sessions
- Implicit requirements hidden in context
- Unclear success criteria
- Ambiguous instructions`,
    type: 'standard',
    status: 'active',
    source: 'Anthropic Best Practices',
    related_patterns: ['explicit-context-pattern'],
    related_adrs: [],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-008',
    name: 'Incremental Verification',
    theory: `Verify changes incrementally rather than at the end of large implementations.

**Why it matters:**
- Catch issues early when they're easier to fix
- Maintain confidence in the codebase
- Reduce debugging complexity
- Enable faster iterations

**Verification Triggers:**
- After each logical unit of work
- Before committing changes
- When switching tasks
- After refactoring

**What to verify:**
- Tests pass
- Build succeeds
- No regressions introduced
- Changes match requirements`,
    type: 'standard',
    status: 'active',
    source: 'Anthropic Best Practices',
    related_patterns: ['incremental-testing'],
    related_adrs: [],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-009',
    name: 'Minimal Viable Changes',
    theory: `Make the smallest change that achieves the goal without over-engineering.

**The Trap:**
It's tempting to "improve" surrounding code while making changes. This leads to:
- Scope creep
- Unexpected regressions
- Harder code reviews
- Longer cycle times

**Guidelines:**
- Fix what's asked, nothing more
- Resist "while I'm here" additions
- Separate refactoring from features
- Document improvement ideas for later

**Exception:**
Fix obvious bugs or security issues discovered during work, but log them separately.`,
    type: 'standard',
    status: 'active',
    source: 'Anthropic Best Practices',
    related_patterns: ['minimal-change-pattern'],
    related_adrs: [],
    version: '1.0.0'
  },
  {
    principle_id: 'PRINCIPLE-010',
    name: 'Read Before Write',
    theory: `Always read and understand existing code before modifying it.

**The Rule:**
Never propose changes to code you haven't read. If asked to modify a file, read it first.

**Why this matters:**
- Understand existing patterns and conventions
- Avoid breaking dependent code
- Maintain consistency with codebase
- Respect architectural decisions

**Approach:**
1. Read the file to understand structure
2. Identify related files and dependencies
3. Understand the change impact
4. Propose modifications that fit existing patterns`,
    type: 'standard',
    status: 'active',
    source: 'Anthropic Best Practices',
    related_patterns: ['codebase-exploration'],
    related_adrs: [],
    version: '1.0.0'
  }
];

/**
 * Get a principle by ID.
 */
export function getPrincipleById(id: string): StandardPrinciple | undefined {
  return STANDARD_PRINCIPLES.find(p => p.principle_id === id);
}

/**
 * Get all active principles.
 */
export function getActivePrinciples(): StandardPrinciple[] {
  return STANDARD_PRINCIPLES.filter(p => p.status === 'active');
}

/**
 * Get principles by source.
 */
export function getPrinciplesBySource(source: string): StandardPrinciple[] {
  return STANDARD_PRINCIPLES.filter(p =>
    p.source.toLowerCase().includes(source.toLowerCase())
  );
}

/**
 * Get principles related to a specific ADR.
 */
export function getPrinciplesForADR(adrId: string): StandardPrinciple[] {
  return STANDARD_PRINCIPLES.filter(p =>
    p.related_adrs?.includes(adrId)
  );
}
