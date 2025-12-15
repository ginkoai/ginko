---
type: pattern
status: current
created: 2025-12-15
updated: 2025-12-15
tags: [sessions, context, handoff, architecture, adr-043]
related: [ADR-043-event-stream-session-model.md, ADR-033-context-pressure-mitigation-strategy.md]
confidence: high
---

# PATTERN-001: Ephemeral Sessions

## Summary

Sessions are ephemeral context windows, not persistent state containers. Session data has a **temporal validity window** of at most a few days, beyond which it becomes "mis-context" - stale assumptions that actively harm rather than help.

## The Core Insight

> Sessions are only useful for context extraction for at maximum a few days. Beyond that, too much has changed and session data will actually contribute to mis-context (i.e., working on things that have already been completed, making assumptions about the state of the project that are no longer factual.)
> — Chris Norton, 2025-12-15

## Pattern Description

### What We Learned

**Initial approach (over-engineered):**
```
Session Start → Work → Handoff Synthesis → Cursor Update → Session End
     ↓
Next Session → Load from Cursor → Reconstruct Context
```

**Problems:**
1. **Handoff synthesis under pressure** - Must create quality summary at 85%+ context utilization
2. **Cursor tracking complexity** - Maintaining position in event stream adds state management burden
3. **Stale context risk** - Old session data becomes actively harmful after 2-3 days

**Current approach (right-sized):**
```
Session Start → Work → Events logged continuously → Session End (optional flush)
     ↓
Next Session → Query "last N events" → Fresh context
```

### Why This Works

| Aspect | Cursor-Based | Last N Events |
|--------|--------------|---------------|
| State management | Complex (track position) | Stateless (chronological query) |
| Handoff requirement | Required for cursor update | Optional (events already logged) |
| Stale data risk | High (old cursors resume old context) | Low (always queries recent) |
| Resilience | Depends on handoff execution | Inherently resilient |

### Temporal Validity Window

Session data is valid for approximately **2-3 days** before it becomes mis-context:

```
Day 0-1: High value    ████████████  Fresh context, accurate state
Day 2-3: Diminishing   ████████░░░░  Some drift, still useful
Day 4+:  Mis-context   ░░░░░░░░░░░░  Stale assumptions, harmful
```

**Why context expires:**
- Code changes rapidly (commits, refactors, fixes)
- Tasks complete and priorities shift
- Architectural decisions supersede old patterns
- Team members make changes that invalidate assumptions

## Resilience Properties

The ephemeral session pattern is inherently resilient to edge cases:

### Edge Case 1: No Explicit Handoff

**Scenario:** User closes terminal without calling `ginko handoff`

**Result:** No data loss
- Events already logged continuously to local file
- Next `ginko start` queries last N events chronologically
- Session log auto-archived on next start

### Edge Case 2: Ungraceful Termination

**Scenario:** Process killed, crash, power loss

**Result:** Minimal data loss
- Events persisted locally before graph sync
- SIGINT/SIGTERM handlers attempt graceful flush
- Dead Letter Queue preserves failed syncs
- Next session loads from local + graph state

### Edge Case 3: Extended Absence

**Scenario:** User returns after 2 weeks

**Result:** Fresh start (by design)
- Old session data would be mis-context anyway
- "Last N events" naturally scopes to recent activity
- User gets accurate current state, not stale assumptions

## Implementation

### Current Files

```
packages/cli/src/lib/context-loader-events.ts  # Last N events loader
packages/cli/src/lib/event-queue.ts            # Continuous event sync
packages/cli/src/lib/session-cursor.ts         # DEPRECATED
packages/cli/src/commands/handoff.ts           # Optional, flushes events
```

### Key Design Decisions

1. **Events logged continuously** at low context pressure (ADR-033)
2. **No synthesis required** at session end (ADR-043)
3. **Cursor tracking deprecated** - over-engineered for actual use case
4. **"Last N events" query** - stateless, resilient, right-sized

### Code Evidence

From `session-cursor.ts:11-16` (deprecation notice):
```typescript
/**
 * @deprecated TASK-011: Cursors are over-engineered for our use case.
 * We only need "last N events" queries, not stateful cursor tracking.
 * Use loadRecentEvents() from context-loader-events.ts instead.
 */
```

## Anti-Patterns

### Anti-Pattern 1: Long-Lived Session State

**Symptom:** Attempting to preserve and restore complete session state across days/weeks

**Problem:** State becomes mis-context, leading to:
- Working on already-completed tasks
- Making assumptions about outdated code structure
- Missing recent team changes

**Solution:** Accept ephemerality; query recent events, not old state

### Anti-Pattern 2: Complex Handoff Synthesis

**Symptom:** Generating detailed handoff documents at session end

**Problem:**
- High cognitive load at high context pressure
- Quality degrades when AI is at 85%+ utilization
- Documents become stale quickly anyway

**Solution:** Log continuously at low pressure; handoff is optional event flush

### Anti-Pattern 3: Cursor Position Tracking

**Symptom:** Maintaining precise position in event stream for resumption

**Problem:**
- Adds state management complexity
- Cursor can become orphaned or stale
- Resuming from old position loads old context

**Solution:** Stateless "last N events" query always gets recent context

## Related Patterns

- **Defensive Logging (ADR-033):** Log at low pressure, not high pressure
- **Event Stream Model (ADR-043):** Events as continuous stream, not discrete sessions

## Verification Checklist

When implementing session-related features, verify:

- [ ] No long-lived state dependencies (2-3 day max assumption)
- [ ] Events logged continuously, not just at boundaries
- [ ] Context loading uses recent query, not old position
- [ ] Handoff is lightweight/optional, not required
- [ ] System resilient to missing handoff calls

## References

- [ADR-043: Event Stream Session Model](../adr/ADR-043-event-stream-session-model.md)
- [ADR-033: Context Pressure Mitigation](../adr/ADR-033-context-pressure-mitigation-strategy.md)
- [session-cursor.ts](../../packages/cli/src/lib/session-cursor.ts) (deprecated)
- [context-loader-events.ts](../../packages/cli/src/lib/context-loader-events.ts)
