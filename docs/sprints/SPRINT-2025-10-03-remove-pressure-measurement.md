# Sprint: Remove Context Pressure Measurement, Keep Defensive Session Logging

**Date:** 2025-10-03
**Status:** Planned
**Type:** Refactoring / Architectural Simplification
**Related:** ADR-033 Context Pressure Mitigation Strategy

## Context

Ginko currently has extensive context pressure tracking infrastructure, but it doesn't actually measure real pressure - just uses placeholder heuristics. This creates false precision and couples Ginko to AI-specific APIs, violating the model-agnostic principle.

**Core Insight:** ADR-033's value is in **continuous logging throughout sessions**, not in measuring pressure. We can achieve the same benefits (high-quality handoffs) through event-based defensive logging without needing to know exact pressure percentages.

## Decision

Remove explicit pressure measurement while keeping defensive session logging based on concrete event triggers (file changes, commits, decisions, etc.) rather than estimated pressure thresholds.

## Implementation Plan

### Phase 1: Remove Pressure Infrastructure

#### Files to Delete
- `packages/cli/src/core/pressure-monitor.ts` - Entire pressure monitoring class (188 lines)
- `packages/cli/test/unit/pressure-monitor.test.ts` - Pressure monitor tests

#### Files to Modify

**`packages/cli/src/types/session-log.ts`**
- Remove `context_pressure` field from `LogEntry` interface
- Remove `context_pressure_at_start` field from `SessionMetadata` interface
- Keep all other fields (category, description, files, impact)

**`packages/cli/src/types/session.ts`**
- Remove `contextPressure` fields from session-related interfaces
- Remove `initial_pressure` references

**`packages/cli/src/utils/session-logger.ts`**
- Remove `contextPressure` parameter from `LogEvent` interface (line 36)
- Remove `initial_pressure` from metadata (line 48)
- Remove `estimateContextPressure()` method (lines 463-477)
- Remove pressure capture in `logEvent()` (line 146)
- Remove pressure display in `formatEventMarkdown()` (lines 332-334)
- Update frontmatter generation to remove `context_pressure_at_start` (line 298)

**`packages/cli/src/core/session-log-manager.ts`**
- Remove `import { PressureMonitor }` (line 23)
- Remove `context_pressure` from `LogEntry` interface (line 34)
- Remove `context_pressure_at_start` from metadata (line 42)
- Remove pressure calculation in `createSessionLog()` (line 81)
- Remove pressure display in entry formatting (line 147)

**`packages/cli/src/commands/status.ts`**
- Remove `import { PressureMonitor }` (line 17)
- Remove entire "Context Pressure" section (lines 57-85)
- Keep "Session Logging" section (shows events logged, files affected)
- Simplify to show: session status, logging activity, recent events

**`packages/cli/src/commands/start/start-reflection.ts`**
- Remove any pressure-related initialization or references
- Keep session log creation (event-based logging still valuable)

#### Tests to Update

**`packages/cli/test/unit/session-log-manager.test.ts`**
- Remove assertions checking pressure fields
- Update snapshots/expectations to exclude pressure
- Focus tests on event capture, categorization, file tracking

**`packages/cli/tests/integration/session-logging.test.ts`**
- Remove pressure-related test cases
- Test event logging, archiving, synthesis without pressure
- Verify handoff quality through log completeness, not pressure

**`packages/cli/test/e2e/session-logging-flow.test.ts`**
- Remove pressure measurement from end-to-end flow
- Test: start → log events → handoff → quality output
- Success = complete timeline, not pressure tracking

### Phase 2: Update Documentation

**`docs/adr/ADR-033-context-pressure-mitigation-strategy.md`**
- Add "Amendment" section explaining removal of explicit measurement
- Update decision to reflect defensive logging approach
- Reframe: "The insight was capturing events early - measurement wasn't necessary"
- Keep core value: Continuous logging throughout session

**`CLAUDE.md`**
- Remove all "Context Pressure" sections
- Remove pressure percentage references
- Update session logging section to emphasize event-based triggers
- Simplify: "Log important events as they happen, handoff synthesizes from logs"

**`docs/context-pressure-management.md`**
- Rename to `docs/session-logging-best-practices.md`
- Focus on WHEN to log (events, not pressure)
- Remove pressure zones, quality curves
- Add event trigger examples

**`docs/session-logging-best-practices-section.md`**
- Remove pressure-aware logging guidance
- Add defensive logging patterns (log after each significant event)
- Emphasize: Consistency > precision

### Phase 3: Simplify AI Instructions

**Update Mental Model**
- **Old:** "Log events when pressure is low (20-80%)"
- **New:** "Log significant events as they happen"

**Event Trigger Examples:**
```markdown
✅ After fixing a bug → Log [fix]
✅ After implementing feature → Log [feature]
✅ After making decision → Log [decision]
✅ After discovering insight → Log [insight]
✅ After git commit → Log [git]
✅ After achievement → Log [achievement]
```

**Remove Pressure Checks:**
- No more "check if pressure < 85% before logging"
- No more "pressure is optimal/degradation/critical"
- Just: "Log when something significant happens"

## Benefits

1. **Model Agnostic** - Works with any AI (Claude, GPT, Gemini, local models)
2. **Simpler** - No measurement infrastructure to maintain
3. **Reliable** - Event triggers are concrete, not estimated
4. **Honest** - Doesn't claim to know pressure percentage
5. **Still Achieves Goal** - Captures insights throughout session for quality handoffs

## Testing Strategy

1. Run existing tests (many will need pressure fields removed)
2. Verify handoff quality with session logging (without pressure)
3. Test cross-AI compatibility (not Claude-specific)
4. Validate event-based logging triggers work consistently

## Worktree Strategy

Execute phases in parallel using git worktrees:

**Worktree 1: `phase1-code-removal`**
- Delete pressure-monitor files
- Modify core TypeScript files
- Update tests

**Worktree 2: `phase2-docs-update`**
- Update ADR-033 with amendment
- Simplify CLAUDE.md
- Rename/refactor pressure docs

**Worktree 3: `phase3-validation`**
- Run test suite
- Verify builds
- Test handoff quality

## Success Criteria

- [ ] All pressure measurement code removed
- [ ] Tests pass without pressure assertions
- [ ] Documentation reflects event-based logging
- [ ] Handoff quality maintained (or improved)
- [ ] No false precision in user-facing output
- [ ] System works with any AI model

## Risks

**Low Risk:** Session logging is independent of pressure measurement. The core insight (log continuously) remains intact. Worst case: We can re-add measurement later if truly needed, but starting simple is better than pretending to measure something we don't.
