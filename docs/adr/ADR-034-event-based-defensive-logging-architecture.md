---
type: decision
status: accepted
updated: 2025-10-03
tags: [architecture, session-logging, defensive-logging, model-agnostic, simplification]
related: [ADR-033-context-pressure-mitigation-strategy.md, ADR-032-core-cli-architecture-and-reflection-system.md]
priority: high
audience: [developer, ai-agent, architect]
estimated-read: 6-min
dependencies: [ADR-033]
---

# ADR-034: Event-Based Defensive Logging Architecture

**Status:** Accepted
**Date:** 2025-10-03
**Authors:** Claude (Sonnet 4.5) + Chris Norton
**Supersedes:** ADR-033 pressure measurement approach

## Context

### The Problem with Pressure Measurement

ADR-033 introduced continuous session logging with context pressure measurement to maintain handoff quality. While the core insight was correct (capture insights throughout sessions), the implementation had fundamental issues:

1. **Model Coupling**: Pressure measurement requires model-specific token counting
   - Different models have different context windows (200k, 128k, 100k, 32k)
   - Token counting APIs vary by vendor (OpenAI, Anthropic, Google, local)
   - Creates tight coupling to specific AI implementations

2. **False Precision**: Displaying "Pressure: 42%" implies accuracy we don't have
   - Estimations based on heuristics (event count × 0.05)
   - No actual token usage from conversation
   - Misleading to users and AI agents

3. **Complexity Without Value**:
   - 187 lines of pressure monitoring code
   - 269 lines of tests
   - Pressure zones, quality curves, thresholds
   - All to answer: "Should I log this event?"

### The Core Insight Remains Valid

**Key Learning from ADR-033**: Logging insights throughout a session (when quality is high) enables better handoffs than logging only at the end (when quality may be degraded).

**The realization**: We don't need to *measure* pressure to achieve this. Event-based triggers are more reliable than estimated thresholds.

## Decision

### Adopt Event-Based Defensive Logging

Replace pressure-based logging triggers with concrete event triggers that are:
- **Model-agnostic**: Work with any AI system
- **Concrete**: Based on observable actions, not estimates
- **Simple**: Clear mental model for developers and AI

### Architecture Principles

1. **Defensive by Default**: Log after every significant event, regardless of "pressure"
2. **Event-Driven**: Trigger on concrete actions (file saved, bug fixed, decision made)
3. **Always Capture**: Never skip logging because pressure "seems low"
4. **Trust the Protocol**: Consistent logging yields quality handoffs

## Implementation

### Event Triggers (Not Pressure Thresholds)

**Old Approach** (pressure-based):
```typescript
// ❌ Requires pressure measurement
if (pressure < 0.85) {
  await logEvent('fix', 'Fixed authentication bug', {
    files: ['auth.ts:123'],
    impact: 'high',
    contextPressure: 0.42  // ← Fake precision
  });
}
```

**New Approach** (event-based):
```typescript
// ✅ Simple, clear, reliable
// After fixing a bug:
await logEvent('fix', 'Fixed authentication bug', {
  files: ['auth.ts:123'],
  impact: 'high'
  // No pressure field needed
});
```

### Logging Protocol

**When to Log** (concrete events):

1. **After fixing bugs**
   - Trigger: Tests pass that were failing
   - What to log: Error, root cause, solution

2. **After implementing features**
   - Trigger: New functionality complete
   - What to log: What was added, why needed

3. **After making decisions**
   - Trigger: Architecture/design choice made
   - What to log: What decided, why, alternatives considered

4. **After discovering insights**
   - Trigger: Learning moment (gotcha, pattern, optimization)
   - What to log: Discovery and implications

5. **After git operations**
   - Trigger: Commit, merge, branch change
   - What to log: Operation and context

6. **After achievements**
   - Trigger: Milestone reached, tests passing
   - What to log: What accomplished

### Simplified Log Format

**Removed Fields**:
- `context_pressure: number` - Not needed
- `context_pressure_at_start: number` - Not needed
- Pressure zones, quality estimates - Not needed

**Essential Fields** (preserved):
```typescript
interface LogEntry {
  timestamp: string;        // When it happened
  category: EventCategory;  // What type of event
  description: string;      // What happened (1-2 sentences)
  files?: string[];        // What files affected
  impact: ImpactLevel;     // How important
}
```

### Mental Model Shift

**Before** (pressure-based):
```
"Log when pressure is between 20-80%"
→ Requires monitoring, estimation, thresholds
→ Model-specific
→ Complex
```

**After** (event-based):
```
"Log after significant events"
→ Clear trigger points
→ Model-agnostic
→ Simple
```

## Architectural Components

### 1. SessionLogger (Simplified)

**Removed**:
- `estimateContextPressure()` method
- `initialPressure` parameter
- Pressure display in markdown

**Preserved**:
- Event categorization (6 categories)
- Atomic append operations
- Archive functionality
- Event validation

### 2. SessionLogManager (Simplified)

**Removed**:
- `PressureMonitor` import
- Pressure calculation in `createSessionLog()`
- `context_pressure` from `LogEntry`
- `avgPressure` from summary stats

**Preserved**:
- Log creation and parsing
- Entry extraction by section
- Summary statistics (counts, files)
- Archive management

### 3. Status Display (Simplified)

**Removed**:
- Pressure percentage display
- Pressure zone indicators (optimal/degradation/critical)
- Quality estimates
- Pressure-based recommendations

**Preserved**:
- Session logging status
- Entry counts by category
- Files affected count
- Smart suggestions (non-pressure)

### 4. Start Command (Simplified)

**Removed**:
- `PressureMonitor` initialization
- Pressure display on startup
- `PressureMonitor.reset()`

**Preserved**:
- Session log creation
- Logging enabled notification
- All other initialization

## Benefits

### 1. Model Agnostic

Works seamlessly with:
- Claude (Anthropic)
- GPT-4/4.5 (OpenAI)
- Gemini (Google)
- Local models (Ollama, LM Studio)
- Future models

No dependency on vendor-specific token counting APIs.

### 2. Simpler Mental Model

**For Developers**:
```
Fix bug → Log it
Make decision → Log it
Achieve milestone → Log it
```

**For AI Agents**:
```
After significant action → Create log entry
No need to check "pressure" first
```

### 3. More Reliable

Event triggers are concrete and observable:
- ✅ "After fixing a bug" - clear trigger
- ✅ "After committing code" - clear trigger
- ❌ "When pressure reaches 45%" - estimation, unclear

### 4. Reduced Complexity

**Code Removed**:
- 187 lines: `pressure-monitor.ts`
- 269 lines: `pressure-monitor.test.ts`
- ~100 lines: Pressure display/calculation across files
- **Total: ~556 lines removed**

**Complexity Removed**:
- Pressure zones and thresholds
- Quality estimation curves
- Token counting heuristics
- Pressure-aware conditional logic

### 5. Still Achieves Core Goal

**Original Goal**: Preserve insights from throughout session for quality handoffs

**Achievement Method**:
- Before: "Log when pressure is low"
- After: "Log after every significant event"

Both approaches capture insights continuously. Event-based is simpler and more reliable.

## Consequences

### Positive

1. **Easier Onboarding**: New developers/AI agents understand "log after events" immediately
2. **Cross-Platform**: Works on any AI system without adaptation
3. **Maintainable**: Less code, simpler logic, fewer edge cases
4. **Honest**: No false precision in pressure percentages
5. **Consistent**: Every significant event gets logged, not just those at certain pressure levels

### Negative

1. **Lost Visibility**: Can't show users "pressure percentage" anymore
   - **Mitigation**: Users don't need this metric; they need quality handoffs

2. **No Pressure-Based Warnings**: Can't warn "pressure is critical"
   - **Mitigation**: Time-based reminders ("been working 2+ hours, consider handoff") more practical

3. **Historical Data**: Old logs have `Pressure: XX%` fields
   - **Mitigation**: Parser ignores unknown fields; backward compatible

### Trade-offs Accepted

We accept:
- Loss of "pressure visibility" metric
- Cannot implement pressure-based features in future

We gain:
- Model agnosticism
- Simplicity
- Reliability
- Maintainability

The trade-off strongly favors simplification.

## Implementation Status

**Phase 1: Code Removal** ✅
- Deleted `pressure-monitor.ts` and tests
- Updated type definitions
- Modified session logger and manager
- Updated status and start commands
- Commit: `c3fa03e`

**Phase 2: Documentation** ✅
- Updated ADR-033 with amendment
- Simplified CLAUDE.md
- Event-based mental model
- Commit: `127975d`

**Phase 3: Cleanup** ✅
- Fixed remaining references
- TypeScript compilation verified
- Commit: `38079e5`

## Migration Guide

### For Developers

**Old Code**:
```typescript
const pressure = PressureMonitor.getCurrentPressure();
if (pressure < 0.85) {
  await logEvent('feature', 'Added auth', {
    contextPressure: pressure
  });
}
```

**New Code**:
```typescript
// Just log it - no pressure check needed
await logEvent('feature', 'Added auth', {
  files: ['auth.ts'],
  impact: 'high'
});
```

### For AI Agents

**Old Instructions**:
> "Monitor context pressure. Log events when pressure is between 20-80%. At 85%+, recommend handoff."

**New Instructions**:
> "Log significant events as they occur. After bug fixes, feature additions, key decisions, insights, git operations, or achievements."

### For Users

No changes required. Session logging continues to work, now with simpler implementation.

## Lessons Learned

1. **Simple Event Triggers > Complex Measurements**: Observable events are more reliable than estimated metrics

2. **Model Agnosticism is Valuable**: Avoiding vendor lock-in enables flexibility

3. **Question the Measurement**: Just because we *can* measure something doesn't mean we *should*

4. **Core Value ≠ Implementation Detail**:
   - Core value: "Capture insights throughout session"
   - Implementation detail: "Using pressure measurement"
   - Can change implementation while preserving value

5. **Defensive Logging Works**: "Always log significant events" is better than "log when conditions are right"

## Broader Implications

### The Vendor Complexity Trap

Modern AI systems are increasingly complex:
- **Multi-agent routing** with independent context windows
- **Frequent model updates** and replacements
- **Vendor-specific implementations** (OpenAI, Anthropic, Google, local)
- **Dynamic context allocation** across subagents

**Example of Routing Complexity**:
```
User Query
  → Main Model (context window: 200k)
    → Routes to Search Agent (context: 128k)
    → Routes to Code Agent (context: 200k)
    → Routes to Analysis Agent (context: 100k)
```

**Anti-Pattern**: Try to measure and adapt to every vendor's implementation
- Which agent's context matters?
- Do we aggregate? Average? Track separately?
- What about agent hand-offs?
- Different vendors route differently
- Models change frequently

**Better Pattern**: Understand fundamental constraints, adopt simple model-agnostic strategies
- Constraint: Context degrades over time
- Solution: Log events as they occur
- Works regardless of vendor, routing, or model architecture

### The Simplicity Principle for AI Integration

When designing systems that integrate with AI:

1. **Understand the fundamentals** (not the implementation details)
   - Context has limits
   - Quality can degrade
   - Different models behave differently

2. **Design simple, observable solutions**
   - Event-based triggers (concrete)
   - Not estimation-based triggers (abstract)
   - Works across all implementations

3. **Avoid vendor coupling**
   - No model-specific APIs
   - No token counting dependencies
   - No architecture assumptions

4. **Test across models**
   - Verify with Claude, GPT, Gemini
   - Try local models (Ollama, LM Studio)
   - Ensure true model-agnosticism

### Future-Proofing

This approach survives:
- ✅ Model updates (GPT-4 → GPT-5, Claude 3 → 4)
- ✅ Vendor changes (switching providers)
- ✅ Architecture shifts (single-agent → multi-agent)
- ✅ New AI paradigms (current unknown unknowns)

**Key Learning**: Don't try to outsmart the model vendors; understand the fundamentals of AI model constraints and adopt simple strategies that remain model-agnostic.

## References

### Related ADRs
- [ADR-033: Context Pressure Mitigation Strategy](./ADR-033-context-pressure-mitigation-strategy.md) - Original pressure-based approach
- [ADR-032: Core CLI Architecture](./ADR-032-core-cli-architecture-and-reflection-system.md) - Session management foundation

### Implementation
- Sprint Plan: `docs/sprints/SPRINT-2025-10-03-remove-pressure-measurement.md`
- Type Definitions: `packages/cli/src/types/session-log.ts`
- Core Logger: `packages/cli/src/utils/session-logger.ts`
- Log Manager: `packages/cli/src/core/session-log-manager.ts`

### Key Commits
- `c3fa03e` - refactor: Remove context pressure measurement infrastructure
- `127975d` - docs: Update to event-based logging
- `38079e5` - fix: Remove remaining pressure measurement references

---

**Key Principle**: *The best measurement is the one you don't need to take.*
