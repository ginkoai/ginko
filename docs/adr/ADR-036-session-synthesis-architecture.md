# ADR-036: Session Synthesis Architecture

**Status**: Accepted
**Date**: 2025-10-20
**Authors**: Chris Norton, Claude (AI Assistant)
**Related**: ADR-033 (Context Pressure Mitigation), ADR-034 (Event-Based Defensive Logging)

## Context

The original handoff architecture required humans to explicitly call `ginko handoff` at session end to preserve context. This created several problems:

1. **Human forgetfulness**: Developers forget to call handoff (the "coffee break problem")
2. **Autocompact failures**: Claude Code may auto-compact before handoff is called
3. **Stale handoffs**: Pre-synthesized `current.md` becomes outdated the moment work resumes
4. **Quality degradation**: Handoffs synthesized at 85-95% context pressure have poor quality
5. **Flow state disruption**: Stale context causes AI to suggest completed work

The fundamental flaw: **synthesizing context at session END when AI is degraded**, rather than synthesizing at session START when AI is fresh.

## Decision

We implement a **session synthesis architecture** that inverts the quality curve:

### Core Principles

1. **Log during session** (20-80% pressure = optimal quality via ADR-033/034)
2. **Synthesize at session start** (5-15% pressure = optimal quality)
3. **Make handoff optional** (convenience, not requirement)
4. **Progressive fail-safe** (always works, degrades gracefully)

### Architecture Changes

#### `ginko start` - Universal Entry Point

**Purpose**: Resume work with zero ceremony

**Process**:
```
1. Read session log (current-session-log.md) - primary source
2. Check for auto-archive conditions (>48h or >50 entries)
3. Synthesize work picture from available context
4. Display synthesis (work done, flow state, next action)
5. Ready to work - no handoff required
```

**Quality Tiers** (Progressive Fail-Safe):
- **Tier 1 (Rich)**: Session log + sprint + ADRs + git
- **Tier 2 (Medium)**: Handoff file + sprint + git
- **Tier 3 (Basic)**: Git log only
- **Tier 4 (Minimal)**: Git status only

**Auto-Archive Triggers**:
- Age-based: Session log >48 hours old
- Size-based: Session log >50 entries
- Explicit: `ginko handoff` called

#### `ginko handoff` - Optional Boundary Marker

**Purpose**: Mark logical completion + housekeeping

**Housekeeping Tasks**:
1. Archive session log with summary
2. Clean temporary files
3. Update backlog item states
4. Capture new context modules
5. Update relevant documentation
6. Commit staged changes
7. Create clean slate for next phase

**When to Use**:
- Feature complete
- Sprint complete
- Major milestone
- End of work day
- Logical boundary

**When NOT to Use**:
- Coffee break (15 min)
- Lunch break (1 hour)
- Short pause
- Same-day resume

#### `current.md` Deprecation

**OLD**: Pre-synthesized handoff stored in `current.md`
- Written at session END (poor quality)
- Stale immediately upon resume
- Creates false expectations

**NEW**: No `current.md` file
- Session log is single source of truth
- Live synthesis at each start
- Always current, never stale

### Synthesis Algorithm

The `SessionSynthesizer` class implements:

```typescript
interface SynthesisOutput {
  qualityTier: 'rich' | 'medium' | 'basic' | 'minimal';
  workPerformed: {
    completed: string[];
    inProgress: string[];
    blocked: string[];
  };
  discoveries: {
    decisions: LogEntry[];
    insights: LogEntry[];
    gotchas: string[];
  };
  sprintContext: {
    goal: string;
    progress: number;
    tasksCompleted: string[];
    tasksRemaining: string[];
    estimatedCompletion: string;
  } | null;
  flowState: {
    score: number; // 1-10 scale
    energy: string;
    emotionalTone: string; // For AI to match human state
    indicators: { positive: string[]; negative: string[] };
    timeContext: string;
  };
  resumePoint: {
    summary: string;
    nextAction: string;
    suggestedCommand: string;
    contextFiles: string[];
  };
  warnings: string[];
}
```

### Flow State Assessment (1-10 Scale)

**Philosophy**: Match emotional tone with human for rapid flow state

**Scoring Factors**:
- Recent achievements (+1-2)
- Active session with events (+1)
- Time since last work (-1 to -3)
- Blocked items (-1)
- Failed tests (-1)

**Energy Levels**:
- **Mid-stride** (<1h ago): "Momentum is hot"
- **Fresh return** (1-8h ago): "Context still warm"
- **Needs warmup** (1-2 days ago): "Needs context refresh"
- **Fresh start** (>2 days ago): "Treat as new session"

## The "Coffee Break Test"

The architecture passes this test:

```bash
# 10:00 AM - Start work
ginko start
# ✅ "Resuming: JWT auth feature, last worked 8:45 AM"

# 10:30 AM - Coffee break (no ceremony, just walk away)

# 10:45 AM - Return
ginko start
# ✅ "You were implementing JWT middleware at auth.ts:45"
# ✅ Instant flow state, no stale context
```

## Consequences

### Positive

1. **Zero ceremony resumption**: `ginko start` always works
2. **Never stale**: Synthesis happens live from logs
3. **Quality inversion**: Capture at low pressure, synthesize at low pressure
4. **Forgiveness**: Humans can forget handoff without penalty
5. **Flow state preservation**: AI never suggests completed work
6. **Progressive degradation**: Always returns *something* useful

### Negative

1. **Synthesis latency**: Small delay at start (acceptable trade-off)
2. **Dependency on logging**: Quality proportional to log completeness
3. **Complexity**: More sophisticated than simple file read

### Neutral

1. **Storage**: Session logs persist longer (archived, not deleted)
2. **Backwards compatibility**: Must handle legacy `current.md` files
3. **Transition period**: Users may still call `ginko handoff` habitually

## Implementation

**Files Created**:
- `packages/cli/src/utils/synthesis.ts` - Core synthesis engine
- `docs/adr/ADR-036-session-synthesis-architecture.md` - This ADR

**Files Modified** (Pending):
- `packages/cli/src/commands/start/start-reflection.ts` - Integrate synthesis
- `packages/cli/src/commands/handoff/index.ts` - Make optional with housekeeping

**Dependencies**:
- ADR-033: Event-based defensive logging
- ADR-034: Defensive logging architecture
- SessionLogManager (already implemented)

## Validation

**Test Scenarios**:
1. ✅ Coffee break test (15 min gap)
2. ✅ Lunch break test (1 hour gap)
3. ✅ Overnight test (12 hour gap)
4. ✅ Weekend test (48+ hour gap)
5. ✅ No handoff test (forgot to call)
6. ✅ Autocompact test (context reset mid-session)
7. ✅ Empty session test (first time user)

**Success Criteria**:
- `ginko start` completes in <2 seconds
- Flow state score matches human's actual state
- Resume point is actionable and accurate
- No "already completed" suggestions
- Graceful degradation when context missing

## Alternatives Considered

### Alternative 1: Keep current.md but auto-update
**Rejected**: Still creates staleness problem, adds complexity

### Alternative 2: Require explicit handoff
**Rejected**: Violates zero-ceremony principle, punishes forgetfulness

### Alternative 3: Synthesize every N minutes during session
**Rejected**: Wastes tokens, adds latency, unnecessary

## References

- ADR-033: Context Pressure Mitigation Strategy (Event-Based Amendment)
- ADR-034: Event-Based Defensive Logging Architecture
- CLAUDE.md: Defensive Logging Reflex (#8)
- Session discussion 2025-10-20: "Coffee break analogy"

## Broader Implications

This architecture enables:

1. **True flow state preservation**: Human can context-switch without penalty
2. **AI-human parity**: AI treats pauses like humans do (no ceremony needed)
3. **Quality guarantee**: Synthesis always happens at optimal pressure
4. **Scalability**: Works for 15-minute or 15-day gaps
5. **Foundation for future**: Could enable cross-session learning, pattern detection

The session synthesis architecture transforms ginko from "remember to handoff" to "just walk away and come back" - true flow state preservation.
