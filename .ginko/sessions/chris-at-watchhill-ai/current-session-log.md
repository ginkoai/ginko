---
session_id: session-2025-12-30T19-40-02-108Z
started: 2025-12-30T19:40:02.108Z
user: chris@watchhill.ai
branch: main
---

# Session Log: session-2025-12-30T19-40-02-108Z

## Timeline
<!-- Complete chronological log of all session events -->
<!-- Includes: fixes, features, achievements, and categorized entries (decisions/insights/git also appear in their sections) -->
<!-- GOOD: "Fixed auth timeout. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11." -->
<!-- BAD: "Fixed timeout" (too terse, missing root cause) -->

## Key Decisions
<!-- Important decisions made during session with alternatives considered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Chose JWT over sessions. Alternatives: server sessions (harder to scale), OAuth (vendor lock-in). JWT selected for stateless mobile support." -->
<!-- BAD: "Chose JWT for auth" (missing alternatives and rationale) -->

## Insights
<!-- Patterns, gotchas, learnings discovered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Discovered bcrypt rounds 10-11 optimal. Testing showed rounds 15 caused 800ms delays; rounds 11 achieved 200ms with acceptable entropy." -->
<!-- BAD: "Bcrypt should be 11" (missing context and discovery process) -->

## Git Operations
<!-- Commits, merges, branch changes -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- Log significant commits with: ginko log "Committed feature X" --category=git -->

## Gotchas
<!-- Pitfalls, traps, and "lessons learned the hard way" -->
<!-- EPIC-002 Sprint 2: These become AVOID_GOTCHA relationships in the graph -->
<!-- GOOD: "EventQueue setInterval keeps process alive. Solution: timer.unref() allows clean exit." -->
<!-- BAD: "Timer bug fixed" (missing symptom, cause, and solution) -->

### 14:59 - [fix]
# [FIX] 14:59

Fixed Insights subcomponents based on UAT feedback: (1) Cold start ratio detection now considers handoffs from previous sessions and events in sessions - sessions with events or following a handoff are warm, not cold; (2) Evidence items now include richer descriptions with timestamps, event counts, and handoff status; (3) Commit message evidence expanded from 40 to 80 chars; (4) Clarified Silent Sessions (zero events) vs Low Event Logging (avg rate below target) with distinct descriptions; (5) Added 5 new principles: ADR, Pattern Documentation, Atomic Commits, Session Handoff, ginko log - now ADR Awareness and Pattern Library insights show principles when expanded.

**Files:**
- packages/cli/src/lib/insights/data-collector.ts
- packages/cli/src/lib/insights/analyzers/*.ts
- dashboard/src/components/insights/PrinciplePreviewModal.tsx

**Impact:** high
**Timestamp:** 2025-12-30T19:59:30.321Z

Files: packages/cli/src/lib/insights/data-collector.ts, packages/cli/src/lib/insights/analyzers/*.ts, dashboard/src/components/insights/PrinciplePreviewModal.tsx
Impact: high
