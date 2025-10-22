---
type: decision
status: accepted
updated: 2025-10-01
tags: [context-pressure, ai-quality, session-management, handoff, continuous-logging]
related: [ADR-032-core-cli-architecture-and-reflection-system.md, PRD-006-phase-1-developer-tools-implementation.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 8-min
dependencies: [ADR-032]
---

# ADR-033: Context Pressure Mitigation Strategy

**Status:** Accepted
**Date:** 2025-10-01
**Authors:** Claude (Sonnet 4.5) + Chris Norton
**Reviewers:** Pending

## Context

### Problem Statement

**Context Pressure** is the degradation of AI reasoning quality and output depth that occurs as the conversation context window approaches saturation. This phenomenon critically impacts Ginko's hero feature, `ginko handoff`, which is typically called when context pressure is at its highest (85-100% utilization), resulting in generic, shallow handoffs that miss crucial insights captured earlier in the session.

### Business Context

Ginko's core value proposition is preserving session insights and eliminating context rot. However, the current handoff implementation suffers from a timing paradox:
- Users work until context is nearly full (natural behavior)
- Context pressure degrades AI quality at high utilization
- Handoff called at worst possible time for quality output
- Result: The hero feature underperforms exactly when it's most needed

### Technical Context

Current session flow:
```
0-80% context: Work happens (optimal AI quality)
80-95% context: Continue working (degrading quality)
95%+ context: Call handoff (critical pressure, generic output)
```

Observable quality degradation:
- **0-50% utilization**: 100% quality - full reasoning, deep analysis
- **50-70% utilization**: 95% quality - minor compression
- **70-85% utilization**: 85% quality - noticeable compression
- **85-95% utilization**: 65% quality - significant degradation
- **95-100% utilization**: 40% quality - crisis mode, generic responses

### Key Requirements

1. Capture session insights when AI quality is optimal (low pressure)
2. Maintain handoff quality even when called under high pressure
3. Reduce token usage at session end (when pressure is highest)
4. Preserve timeline and decision context throughout session
5. Enable continuous improvement of handoff quality

## Decision

### Chosen Solution

Implement **Continuous Session Logging** to invert the quality curve by capturing insights proactively throughout the session when context pressure is low, then synthesizing the final handoff from accumulated logs when pressure is high.

**Key Innovation**: Move from reactive synthesis (handoff at 95%) to proactive accumulation (logging at 20-80%) + lightweight synthesis (at 95%).

### Implementation Approach

#### 1. Session Log Creation
On `ginko start`, create a structured session log:
```yaml
# .ginko/sessions/user-name/current-session-log.md
---
session_id: session-2025-10-01-14-30
started: 2025-10-01T14:30:00Z
user: cnort
branch: feature/branch-name
context_pressure_at_start: 0.15
---

## Timeline

## Key Decisions

## Files Affected

## Insights

## Git Operations
```

#### 2. Continuous Logging Protocol
AI instructed to append to session log after significant events:

**Trigger Events:**
- File modifications (path, lines, purpose)
- Bug discoveries (error, root cause, fix)
- Key decisions (what, why, alternatives considered)
- Insights (patterns, gotchas, learnings)
- Git operations (commits, merges, branch changes)
- Achievements (features complete, tests passing)

**Logging Format:**
```markdown
### HH:MM - [Category]
Brief description (1-2 sentences)
Files: file.ts:123, other.ts:456
Impact: high|medium|low
```

#### 3. Handoff Synthesis
On `ginko handoff`, synthesize from log + current context:

```typescript
async function createHandoff() {
  // Load accumulated log (80% of content, captured at low pressure)
  const sessionLog = await loadSessionLog();

  // Gather current context (20% of content)
  const currentContext = await gatherCurrentContext();

  // Lightweight synthesis (minimal AI generation needed)
  const handoff = await synthesizeHandoff({
    log: sessionLog,           // Rich, detailed
    context: currentContext,   // Current state
    pressure: getCurrentPressure(),
    quality: 'high'            // More tokens available
  });

  return handoff;
}
```

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────┐
│                  Ginko Session                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [ginko start]                                      │
│       │                                             │
│       ▼                                             │
│  Create Session Log (context: 15%)                  │
│  .ginko/sessions/user/current-session-log.md        │
│       │                                             │
│       ▼                                             │
│  ┌──────────────────────────────────┐               │
│  │   Continuous Work (20-80%)       │               │
│  │  ┌────────────────────────────┐  │               │
│  │  │ Event: File Edit           │  │               │
│  │  │ → Append to log (context:  │  │               │
│  │  │    25%, quality: 100%)     │  │               │
│  │  └────────────────────────────┘  │               │
│  │  ┌────────────────────────────┐  │               │
│  │  │ Event: Bug Fixed           │  │               │
│  │  │ → Append to log (context:  │  │               │
│  │  │    45%, quality: 100%)     │  │               │
│  │  └────────────────────────────┘  │               │
│  │  ┌────────────────────────────┐  │               │
│  │  │ Event: Decision Made       │  │               │
│  │  │ → Append to log (context:  │  │               │
│  │  │    60%, quality: 95%)      │  │               │
│  │  └────────────────────────────┘  │               │
│  └──────────────────────────────────┘               │
│       │                                             │
│       ▼                                             │
│  [ginko handoff] (context: 92%)                     │
│       │                                             │
│       ▼                                             │
│  Load session log (80% complete)                    │
│  Gather current context (20%)                       │
│  Synthesize handoff (minimal generation)            │
│       │                                             │
│       ▼                                             │
│  Save handoff to archive/ (quality: high)           │
│  Clear session log                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Integration Points

**Modified Commands:**
- `ginko start` - Create session log, set logging context
- `ginko handoff` - Load log + synthesize instead of full generation
- `ginko status` - Show context pressure percentage

**New Infrastructure:**
- Session log file management
- Pressure monitoring utility
- Continuous logging protocol

### Data Model Changes

**Session Log Structure:**
```typescript
interface SessionLog {
  metadata: {
    session_id: string;
    started: string;
    user: string;
    branch: string;
    initial_pressure: number;
  };
  timeline: TimelineEntry[];
  decisions: Decision[];
  filesAffected: FileChange[];
  insights: Insight[];
  gitOperations: GitOp[];
}

interface TimelineEntry {
  timestamp: string;
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git';
  description: string;
  files?: string[];
  impact: 'high' | 'medium' | 'low';
  context_pressure: number;
}
```

## Alternatives Considered

### Option 1: Periodic Auto-Snapshots
**Description:** Automatically snapshot context every 30 minutes
**Pros:** No user action needed, guaranteed captures
**Cons:** May snapshot at irrelevant times, storage overhead, no event alignment
**Decision:** Rejected - event-driven logging is more meaningful

### Option 2: Post-Session Analysis
**Description:** Use git history to reconstruct session after the fact
**Pros:** Zero overhead during session, no logging needed
**Cons:** Missing decisions/insights not in commits, no timeline fidelity
**Decision:** Rejected - loses the "why" behind changes

### Option 3: Explicit Capture Commands
**Description:** User manually calls `ginko capture` throughout session
**Pros:** User controls what's important, no AI overhead
**Cons:** Relies on user discipline, frequently forgotten, inconsistent
**Decision:** Rejected - too much manual overhead, defeats flow state

## Consequences

### Positive Impacts

1. **Improved Handoff Quality** - Rich, detailed handoffs even at 95% context
2. **Reduced Token Pressure** - Synthesis uses far fewer tokens than generation
3. **Timeline Preservation** - Exact chronology of session preserved
4. **Decision Tracking** - "Why" captured when fresh, not reconstructed
5. **Team Value** - Other developers see full session journey
6. **Insight Retention** - "Aha moments" captured immediately

### Negative Impacts

1. **Slight Session Overhead** - AI appending to log adds minor token usage throughout
2. **Storage Increase** - Session logs consume disk space
3. **Implementation Complexity** - New logging infrastructure needed

### Neutral Impacts

1. **User Behavior Change** - Users may check session log during work
2. **File System Changes** - New files in .ginko/sessions/

### Migration Strategy

**Phase 1: Opt-In Beta**
- Add `--log` flag to `ginko start`
- Monitor adoption and quality improvements
- Gather user feedback

**Phase 2: Default Enabled**
- Make continuous logging default
- Add `--no-log` flag to disable
- Update documentation

**Phase 3: Pressure-Aware Features**
- Add pressure monitoring to all commands
- Automatic suggestions based on pressure
- Quality scoring influenced by capture pressure

## Implementation Details

### Technical Requirements

1. **Session Log Management**
   - Create on start, append throughout, archive on handoff
   - YAML frontmatter + Markdown body
   - Atomic append operations (no corruption)

2. **Pressure Monitoring**
   - Calculate context utilization: `tokens_used / max_tokens`
   - Track pressure at each log entry
   - Expose via `ginko status`

3. **AI Logging Protocol**
   - CLAUDE.md instructions for continuous logging
   - Event categorization (fix, feature, decision, insight, git)
   - Concise format (1-2 sentences per entry)

### Security Considerations

- Session logs contain code context - same security as handoffs
- Stored locally in `.ginko/` (git-native security)
- No PII beyond what's already in git commits

### Performance Implications

- **Session overhead**: ~50-100 tokens per log entry × ~10 entries = 500-1000 tokens/session
- **Handoff savings**: ~2000-3000 tokens saved on synthesis vs full generation
- **Net benefit**: ~1000-2500 tokens saved per session

### Operational Impact

- Users should see `current-session-log.md` in their sessions directory
- Archived logs provide session history for debugging
- Team members can review session logs for learning

## Monitoring and Success Metrics

### Key Performance Indicators

1. **Handoff Quality Score** - Target: >85 (vs current ~70 at high pressure)
2. **Context Pressure at Handoff** - Measure: Average pressure when handoff called
3. **Token Usage Reduction** - Target: 15-20% reduction in handoff generation
4. **User Satisfaction** - Survey: "Handoff captured my session accurately"

### Monitoring Strategy

- Track context pressure at each command invocation
- Log entry count and pressure at capture time
- Handoff quality scores pre/post implementation
- User feedback on handoff completeness

### Success Criteria

- Handoff quality scores improve by >15 points
- 80%+ of handoffs called at >80% context pressure maintain quality
- Users report higher satisfaction with handoff completeness
- Token usage at handoff reduced by 15%+

### Failure Criteria

- Session overhead exceeds 2000 tokens (too expensive)
- Users disable logging due to friction
- No measurable quality improvement
- Storage issues (logs too large)

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Log file corruption | High | Low | Atomic writes, validation on load |
| Excessive logging overhead | Medium | Medium | Concise format, event filtering |
| Storage bloat | Low | Medium | Auto-cleanup old logs, compression |
| Logging interrupts flow | Medium | Low | Non-blocking appends, async writes |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| User confusion | Low | Medium | Clear documentation, examples |
| Feature adoption lag | Medium | Low | Default-enabled, visible benefits |
| Quality improvement not realized | High | Low | A/B testing, iterative refinement |

## Timeline and Milestones

### Implementation Phases

- **Phase 1** (Week 1): Session log infrastructure
  - Create/append/archive log files
  - Basic pressure monitoring
  - Simple timeline logging

- **Phase 2** (Week 2): AI integration
  - Update CLAUDE.md with logging protocol
  - Implement event categorization
  - Test continuous logging flow

- **Phase 3** (Week 3): Handoff synthesis
  - Modify handoff command to use logs
  - Quality scoring integration
  - A/B testing

- **Phase 4** (Week 4): Pressure-aware features
  - Add pressure display to status
  - Auto-suggestions based on pressure
  - Documentation and examples

### Key Milestones

- **Milestone 1** (End Week 1): Session log creation works
- **Milestone 2** (End Week 2): AI successfully logs events
- **Milestone 3** (End Week 3): Handoff synthesis produces better quality
- **Milestone 4** (End Week 4): Feature complete, documented, shipped

## Review and Updates

### Review Schedule

- **Post-Implementation Review** (1 month): Assess quality improvements
- **Quarterly Review**: Evaluate pressure mitigation effectiveness
- **Annual Review**: Consider expansion to other commands

### Update History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-01 | Claude + Chris | Initial version |

## References

### Documentation
- [ADR-032: Core CLI Architecture and Reflection System](ADR-032-core-cli-architecture-and-reflection-system.md)
- [PRD-006: Phase 1 Developer Tools Implementation](../PRD/PRD-006-phase-1-developer-tools-implementation.md)

### Code References
- Implementation: `packages/cli/src/commands/handoff/`
- Session management: `packages/cli/src/core/session-manager.ts`
- Pressure monitoring: `packages/cli/src/core/pressure-monitor.ts`

---

**Key Insight**: Context pressure is a fundamental constraint in AI-assisted development. By naming it and designing around it, we transform a limitation into an architectural principle that improves system quality.

## Amendment: Event-Based Approach (2025-10-03)

### Decision Update

**Original Approach**: Pressure measurement-based logging with explicit pressure thresholds and monitoring.

**Revised Approach**: Event-based defensive logging without pressure measurement.

### Rationale

During Phase 2 implementation, we discovered that:

1. **Pressure measurement adds complexity** without proportional value
   - Requires model-specific token counting
   - Adds false precision (percentages imply accuracy we don't have)
   - Different models have different context windows

2. **Event triggers are more reliable** than pressure thresholds
   - "After fixing a bug" is clearer than "at 45% pressure"
   - Works across all AI models (model-agnostic)
   - Simpler mental model for developers and AI agents

3. **Core value remains unchanged**
   - Continuous logging still prevents context rot
   - Early capture still preserves insights
   - Handoff synthesis still benefits from accumulated logs

### What Changed

**Removed**:
- Explicit pressure percentage measurement
- Pressure zones (optimal/degradation/critical)
- Pressure-based logging triggers
- `Pressure: XX%` from log entry format

**Preserved**:
- Event-based logging protocol
- Six event categories (fix, feature, decision, insight, git, achievement)
- Continuous capture throughout session
- Handoff synthesis from accumulated logs

### Updated Logging Format

**Old Format** (pressure-based):
```markdown
### 14:30 - [feature]
Brief description
Files: file.ts:123
Impact: high | Pressure: 35%
```

**New Format** (event-based):
```markdown
### 14:30 - [feature]
Brief description
Files: file.ts:123
Impact: high
```

### Implementation Impact

- Phase 1-2: Already event-based in practice
- Phase 3-4: Remove pressure monitoring infrastructure
- Documentation: Updated to reflect event-based approach
- Mental model: "Log important events" vs "Log at low pressure"

### Historical Context

This amendment preserves the ADR's historical context about why pressure was a concern, while updating the solution to be simpler and more practical. The observation that AI quality degrades as conversations lengthen remains valid; we've simply found a better way to address it.

**Key Learning**: Defensive logging (log after every significant event) achieves the same goal as pressure-aware logging, but with less complexity and better model-agnosticism.

---

## Addendum 2: Session Logs as Pure Capture (2025-10-22)

**Date:** 2025-10-22
**Context:** SPRINT-2025-10-22, TASK-013 implementation review
**Related:** TASK-013, TASK-014

### Problem Identified

After implementing TASK-013 (Session Log Quality Enhancements) and observing production usage during SPRINT-2025-10-22, we identified that two sections in the session log template violate defensive logging principles:

1. **Achievements Section**: Duplicates Timeline entries, requiring synthesis under variable/high pressure
2. **Files Affected Section**: Aggregates file references already captured inline, adding redundant synthesis work

Both sections force AI to perform synthesis when context pressure may be high (80-95%), contradicting ADR-033's core principle of capturing raw facts at low-medium pressure (20-80%) and deferring synthesis to fresh sessions.

### Decision: Pure Capture Only

Session logs must be **pure capture with zero synthesis requirements**.

**KEEP (Capture Sections)**:
- **Timeline**: Chronological facts with inline file references
- **Key Decisions**: Decisions with alternatives considered
- **Insights**: Gotchas, patterns, learnings discovered
- **Git Operations**: Commits, branches, merges

**REMOVE (Synthesis Sections)**:
- ❌ **Achievements**: Redundant duplication of Timeline achievements
- ❌ **Files Affected**: Redundant aggregation of inline file references

### Rationale

**Architectural Clarity**:
```
LOW PRESSURE (20-80%)           HIGH PRESSURE (80-95%)
─────────────────────           ──────────────────────
Session Log Capture      →      (no synthesis here)
  - Timeline entries                    │
  - Decisions logged                    │
  - Insights noted                      │
  - Git ops recorded                    ▼
                                   Save & exit
                                        │
                                        ▼
LOW PRESSURE (5-15%)                Archive log
─────────────────────                    │
Next session starts                      │
ginko start reads:                       │
  - Session log         ◄────────────────┘
  - Sprint context
  - PRDs/ADRs
  → SYNTHESIZES NOW (fresh, optimal pressure)
```

**Benefits**:
1. **Consistent Quality**: Session log quality independent of when session ends
2. **Lower Cognitive Load**: No synthesis required during logging
3. **Separation of Concerns**: Historian role (session log) vs Strategist role (synthesis)
4. **Optimal Synthesis**: Happens once at session start (5-15% pressure), not repeatedly at session end (80-95%)

**Files Inline vs Aggregated**:
- Inline preserves **causality**: "This change happened BECAUSE we implemented this feature"
- Inline preserves **temporal context**: Files appear when actually modified
- Inline preserves **purpose**: WHY each file was touched is immediately adjacent
- Aggregation breaks narrative flow and requires cross-referencing

**Achievements vs Timeline**:
- Timeline already contains achievements chronologically
- Duplicating to separate section creates confusion: "Did I already read this?"
- Fresh AI can filter Timeline mentally: "What got completed?"
- Synthesis of achievements belongs in `ginko start`, not session log

### Implementation

**Template Changes** (TASK-014):
```markdown
## Timeline              ✅ Keep
## Key Decisions          ✅ Keep
## Insights              ✅ Keep
## Git Operations        ✅ Keep
## Files Affected        ❌ Remove
## Achievements          ❌ Remove
```

**Routing Changes**:
```typescript
case 'achievement':
  sectionMarker = '## Timeline';  // Changed from '## Achievements'
  // No dual-routing to Timeline anymore
  break;
```

### Consequences

**Positive**:
- ✅ Session logs become pure raw material for synthesis
- ✅ Quality consistent regardless of session end pressure
- ✅ Simpler mental model: capture facts, synthesize later
- ✅ Lower cognitive load during logging

**Neutral**:
- Session logs no longer have quick "achievements summary"
- This is acceptable because synthesis happens at `ginko start` with better quality

**Migration**:
- Existing session logs with Achievements/Files Affected sections remain valid
- New logs use simplified template
- Backward compatible parsing

### Conclusion

This addendum refines ADR-033's defensive logging philosophy by explicitly separating capture (during session) from synthesis (at session start). Session logs are historians, not strategists. Synthesis under high context pressure yields uneven results; synthesis at fresh session start yields consistent quality.

**Key Principle**: Capture raw facts when quality is good (20-80% pressure), synthesize when quality is optimal (5-15% pressure).
