# ADR-060: Content/State Separation - Graph-Authoritative Operational State

## Status
Accepted

## Date
2026-01-16

## Context

Ginko was built as a "git-native" CLI tool where sprint files live in `docs/sprints/` as markdown. The graph database (Neo4j + dashboard) was added later for visualization and team collaboration. This created ambiguity about which system is the source of truth.

### The Problem We Encountered

During a session, `ginko start` reported tasks t02-t06 as "not started" when they were actually complete:

```
Sprint: Graph Explorer v2 Sprint 1 - Hierarchy Nav... 14% e011_s01_t02/6
├── 01 Refactor Nav Tree for Hierarchy [x]
├── 02 Add Parent Link to Detail Cards [ ]  ← Actually complete
├── 03 Show Child Summary Cards [ ]          ← Actually complete
...
```

**Root cause**: Three potential sources of truth had diverged:
1. `CURRENT-SPRINT.md` - showed 14% (1/7 complete)
2. Sprint-specific file - showed 86% (6/7 complete)
3. Graph database - showed different state

This class of bug is inherent to any dual-write architecture where multiple systems maintain the same state.

### Current Architecture Issues

| Issue | Impact |
|-------|--------|
| Sync must work perfectly | Any failure causes state divergence |
| 2x write overhead | Every status change updates file AND graph |
| Delayed team visibility | Status changes require git push cycle |
| High context pressure | AI must parse markdown files to get status |
| No event model | Can't trigger webhooks on status changes |

### Options Considered

**A. Git as source of truth, graph as cache**
- Retains git-native approach
- Cons: sync complexity, maintenance burden, delayed visibility

**B. Hybrid with local backup**
- Similar complexity to Option A
- Still has dual-write problem

**C. Graph-only for operational state**
- Clear source of truth
- Lower complexity
- Immediate team visibility
- Natural event model for webhooks

## Decision

**Separate content from state** - Git owns content, Graph owns state.

### What Lives Where

| Type | Nature | Home | Rationale |
|------|--------|------|-----------|
| ADRs, Patterns, Gotchas, PRDs | Knowledge artifacts | **Git** | Version controlled, reviewable, long-lived |
| Charter | Long-lived document | **Git** | Foundational, rarely changes |
| Session logs | Chronological record | **Git** | Historical archive |
| Epic/Sprint/Task **definitions** | Authored content (goals, descriptions, acceptance criteria) | **Git** (synced to graph) | Content that benefits from version control |
| Epic/Sprint/Task **status** | Operational state | **Graph only** | Real-time, collaborative |
| Assignments, progress | Operational state | **Graph only** | Frequently changing |

### New Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        GIT                              │
│  Knowledge: ADRs, Patterns, Gotchas, PRDs, Charter      │
│  Content: Epic/Sprint/Task definitions (descriptions)   │
│  History: Session logs, archives                        │
└─────────────────────────────────────────────────────────┘
                          │
                    ginko sync (content only, one-way)
                          ↓
┌─────────────────────────────────────────────────────────┐
│                       GRAPH                             │
│  Content mirror: Epic/Sprint/Task definitions           │
│  State (authoritative): status, assignments, progress   │
│  Events: status changes → webhooks, notifications       │
└─────────────────────────────────────────────────────────┘
```

### New CLI Commands

```bash
# Status updates go directly to graph
ginko task complete e011_s01_t02       # Mark task complete
ginko task start e011_s01_t03          # Mark task in-progress
ginko task pause e011_s01_t03          # Mark task paused
ginko task block e011_s01_t03 "reason" # Mark task blocked

ginko sprint start e011_s01            # Mark sprint in-progress
ginko sprint complete e011_s01         # Mark sprint complete

ginko epic start e011                  # Mark epic in-progress
ginko epic complete e011               # Mark epic complete
```

### What Gets Eliminated

- `CURRENT-SPRINT.md` file (replaced by graph query)
- Sprint file status parsing in `ginko start`
- Status fields in sprint markdown files
- Bidirectional sync complexity
- The bug class we encountered

### What Gets Preserved

- Git-tracked sprint/task definitions (content)
- Version history for content changes
- Offline access to documentation
- "Git-native" identity for knowledge artifacts

### Offline Resilience

1. Cache last-known state locally (`.ginko/state-cache.json`)
2. `ginko start` works offline with stale indicator
3. Status updates queue until online
4. Graceful degradation: "Graph unavailable, showing cached state from 2h ago"

## Consequences

### Positive
- **Eliminates sync bugs** - Single source of truth for state
- **Immediate team visibility** - No git push/pull cycle needed
- **Lower context pressure** - AI calls API instead of parsing files
- **Event model enabled** - `onTaskComplete` → webhook, notification
- **Simpler maintenance** - State logic in one place

### Negative
- **Requires internet for status changes** - Mitigated by queuing
- **Significant refactoring** - One-time cost
- **Graph must be reliable** - Neo4j Aura has good uptime

### Neutral
- Sprint markdown files become simpler (content only, no status)
- `ginko sync` scope narrows to content sync only

## Implementation

See EPIC-015: Graph-Authoritative State Migration

### Migration Strategy

1. **Phase 1**: Add CLI commands for status updates (`ginko task complete`, etc.)
2. **Phase 2**: Update `ginko start` to read status from graph only
3. **Phase 3**: Remove status from sprint markdown files
4. **Phase 4**: Deprecate `CURRENT-SPRINT.md`
5. **Phase 5**: Add offline caching and queuing

## References

- EPIC-015: Graph-Authoritative State Migration
- ADR-054: Dashboard to Git Sync (superseded for state, retained for content)
- [Neo4j Aura SLA](https://neo4j.com/cloud/aura/sla/)
