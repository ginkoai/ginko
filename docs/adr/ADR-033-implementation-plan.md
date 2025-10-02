# ADR-033: Continuous Session Logging Implementation Plan

**Status**: Ready for Implementation
**Date**: 2025-10-01
**Parent ADR**: [ADR-033: Context Pressure Mitigation Strategy](ADR-033-context-pressure-mitigation-strategy.md)

## Overview
Implement continuous session logging to capture insights at low context pressure (20-80%), then synthesize high-quality handoffs even when called at high pressure (85-100%).

## Architecture Summary
- **Session logs**: `.ginko/sessions/[user]/current-session-log.md`
- **Event-driven logging**: AI appends entries after significant events
- **Lightweight synthesis**: Handoff pulls from log instead of generating from scratch
- **Token savings**: ~1000-2500 tokens per session

---

## Phase 1: Session Log Infrastructure (Week 1)
**Goal**: Create/append/archive session log files with basic pressure monitoring

### 1.1 Create Session Log Manager (`packages/cli/src/core/session-log-manager.ts`)
- Create `SessionLogManager` class
- Methods:
  - `createSessionLog()` - Initialize log on `ginko start`
  - `appendEntry(entry: LogEntry)` - Atomic append operation
  - `archiveLog()` - Move to archive on handoff
  - `loadSessionLog()` - Read current log
- Log structure (YAML frontmatter + Markdown):
  ```yaml
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

**Testing**:
- Unit tests for log creation/append/archive
- Validate YAML frontmatter parsing
- Test atomic append (no corruption)
- Verify log archival with timestamp

### 1.2 Create Pressure Monitor (`packages/cli/src/core/pressure-monitor.ts`)
- Calculate context pressure: `tokens_used / max_tokens`
- Methods:
  - `getCurrentPressure()` - Return 0-1 float
  - `getPressureZone()` - Return 'optimal'|'degradation'|'critical'
  - `shouldLogEvent()` - True if pressure < 0.85
- Integration with Claude API token counts

**Testing**:
- Mock token usage scenarios (20%, 60%, 90%, 95%)
- Verify zone calculations
- Test logging threshold triggers

### 1.3 Modify `ginko start` command
- Call `SessionLogManager.createSessionLog()`
- Display initial pressure percentage
- Set logging context for AI

**Testing**:
- E2E test: `ginko start` creates log file
- Verify frontmatter populated correctly
- Check pressure displayed in output

---

## Phase 2: AI Logging Protocol (Week 2)
**Goal**: Enable AI to log events continuously throughout session

### 2.1 Define Log Entry Types (`packages/cli/src/types/session-log.ts`)
```typescript
interface LogEntry {
  timestamp: string;
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string; // 1-2 sentences
  files?: string[];
  impact: 'high' | 'medium' | 'low';
  context_pressure: number;
}
```

### 2.2 Update CLAUDE.md with Logging Instructions
Add protocol for AI to append entries after:
- File modifications (path, purpose)
- Bug fixes (error, root cause, solution)
- Key decisions (what, why, alternatives)
- Insights (patterns, gotchas, learnings)
- Git operations (commits, branch changes)
- Achievements (features complete, tests passing)

Format:
```markdown
### HH:MM - [Category]
Brief description (1-2 sentences)
Files: file.ts:123, other.ts:456
Impact: high|medium|low
```

### 2.3 Create Logging Helper (`packages/cli/src/utils/session-logger.ts`)
- `logEvent(category, description, metadata)` - Convenience wrapper
- Auto-capture timestamp and pressure
- Validate entry format
- Call `SessionLogManager.appendEntry()`

**Testing**:
- Unit tests for entry formatting
- Test concurrent append operations
- Verify pressure captured correctly
- Validate against AI instructions in CLAUDE.md

---

## Phase 3: Handoff Synthesis (Week 3)
**Goal**: Modify handoff to use logs for lightweight synthesis

### 3.1 Update `HandoffPipeline` (`packages/cli/src/commands/handoff/handoff-reflection-pipeline.ts`)
**Changes**:
1. Add `loadSessionLog()` step before `gatherContext()`
2. Modify `buildHandoffContent()` to use log entries:
   - Timeline from log entries
   - Decisions from decision entries
   - Files from affected files log
   - Achievements from achievement entries
3. Calculate synthesis vs generation ratio (80/20)

**Synthesis Strategy**:
```typescript
async function createHandoff() {
  const sessionLog = await loadSessionLog(); // 80% of content
  const currentContext = await gatherCurrentContext(); // 20%

  return synthesizeHandoff({
    log: sessionLog,           // Rich timeline already captured
    context: currentContext,   // Current uncommitted state
    pressure: getCurrentPressure(),
    quality: 'high'            // More tokens available
  });
}
```

**Testing**:
- Unit tests for log parsing
- Test synthesis with various log sizes (5, 20, 50 entries)
- Compare quality scores: old vs new approach
- A/B test: handoff at 50% vs 95% pressure

### 3.2 Quality Scoring Enhancement
Modify `HandoffQualityScorer` to:
- Track context pressure at handoff time
- Score timeline completeness from log
- Measure decision context preservation
- Compare pre/post implementation quality

**Testing**:
- Baseline quality scores (current implementation)
- Target: >85 score at 95% pressure (vs current ~70)

### 3.3 Archive Session Log After Handoff
- Move log to `.ginko/sessions/[user]/archive/[timestamp]-session-log.md`
- Clean up temp files
- Create fresh log for next session

**Testing**:
- Verify log archived with timestamp
- Check new log created clean
- Ensure no data loss in archive

---

## Phase 4: Pressure-Aware Features (Week 4)
**Goal**: Add pressure monitoring to all commands

### 4.1 Enhance `ginko status` Command
Display:
```
📊 Context Pressure: 65% (degradation zone)
⚡ Quality Estimate: 95%
💡 Recommendation: Continue working (handoff at 85%)
```

### 4.2 Auto-Suggestions Based on Pressure
- At 75%: "💡 Consider handoff soon to preserve quality"
- At 85%: "⚠️  Quality degrading - recommend handoff now"
- At 95%: "🔴 Critical pressure - handoff strongly recommended"

### 4.3 Documentation and Examples
Create:
- `docs/adr/ADR-033-implementation-guide.md`
- `docs/examples/session-logging-example.md`
- Update `CLAUDE.md` with logging best practices
- Add to `.ginko/context/modules/context-pressure-management.md`

**Testing**:
- Documentation review
- Example walkthroughs
- User acceptance testing

---

## Testing Strategy

### Unit Tests
- **Session Log Manager**: Create/append/archive/load
- **Pressure Monitor**: Calculation, zones, thresholds
- **Log Entry Formatting**: Validation, parsing
- **Handoff Synthesis**: Log parsing, content building

### Integration Tests
- **Full Session Flow**: Start → Log → Handoff → Archive
- **Pressure Monitoring**: Track pressure throughout session
- **Quality Scoring**: Compare old vs new approach

### E2E Tests
- **Low Pressure Session** (20-60%): Verify logging works
- **High Pressure Session** (85-95%): Verify quality maintained
- **Multi-Session Continuity**: Archive → New session → Load context

### Performance Tests
- **Token Usage**: Measure overhead (target: <1000 tokens/session)
- **Handoff Savings**: Measure reduction (target: >1000 tokens saved)
- **File I/O**: Validate atomic appends, no corruption

---

## Success Metrics (from ADR-033)

1. **Handoff Quality Score**: >85 at high pressure (vs current ~70)
2. **Token Usage Reduction**: 15-20% reduction in handoff generation
3. **Context Pressure at Handoff**: Track average pressure when called
4. **User Satisfaction**: Survey on handoff completeness

---

## Rollout Strategy

### Beta (Weeks 1-3)
- `ginko start --log` - Opt-in flag
- Monitor adoption and quality
- Gather user feedback
- Iterate on logging protocol

### Default Enabled (Week 4)
- Make logging default behavior
- Add `ginko start --no-log` to disable
- Update all documentation
- Team training/announcement

### Post-Launch (Month 2)
- Monitor quality metrics
- Expand to other commands (`ginko capture`, `ginko reflect`)
- Add pressure-aware auto-suggestions
- Annual review for expansion

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Log file corruption | Atomic writes, validation on load, backup before append |
| Excessive logging overhead | Concise format (1-2 sentences), event filtering, pressure threshold |
| Storage bloat | Auto-cleanup logs >30 days, compression for archives |
| Logging interrupts flow | Non-blocking appends, async writes, minimal user friction |
| Quality not improved | A/B testing, iterative refinement, fallback to old approach |

---

## Implementation Approach: Git Worktrees + Sonnet Subagents

### Worktree Strategy
Create isolated worktrees for each phase to enable parallel development:

```bash
# Phase 1: Infrastructure
git worktree add ../ginko-phase1-infrastructure feature/adr-033-phase1-infrastructure

# Phase 2: AI Protocol
git worktree add ../ginko-phase2-ai-protocol feature/adr-033-phase2-ai-protocol

# Phase 3: Handoff Synthesis
git worktree add ../ginko-phase3-handoff-synthesis feature/adr-033-phase3-handoff-synthesis

# Phase 4: Pressure Features
git worktree add ../ginko-phase4-pressure-features feature/adr-033-phase4-pressure-features
```

### Subagent Delegation
Each phase will be implemented by a specialized Sonnet subagent:
- **Phase 1 Agent**: Focus on file I/O, data structures, atomic operations
- **Phase 2 Agent**: Focus on TypeScript types, CLAUDE.md integration
- **Phase 3 Agent**: Focus on pipeline refactoring, quality scoring
- **Phase 4 Agent**: Focus on UX, documentation, examples

### Benefits
- **Parallel Development**: Multiple phases can progress simultaneously
- **Context Isolation**: Each agent has clean, focused context
- **Easy Testing**: Each worktree can be tested independently
- **Simple Integration**: Merge branches sequentially after validation

---

## Key Files to Create/Modify

### New Files
- `packages/cli/src/core/session-log-manager.ts`
- `packages/cli/src/core/pressure-monitor.ts`
- `packages/cli/src/types/session-log.ts`
- `packages/cli/src/utils/session-logger.ts`
- `packages/cli/tests/unit/session-log-manager.test.ts`
- `packages/cli/tests/unit/pressure-monitor.test.ts`
- `packages/cli/tests/e2e/session-logging.test.ts`

### Modified Files
- `packages/cli/src/commands/start.ts` - Initialize session log
- `packages/cli/src/commands/handoff/handoff-reflection-pipeline.ts` - Load log, synthesize
- `packages/cli/src/commands/status.ts` - Display pressure
- `CLAUDE.md` - Add logging protocol
- `packages/cli/src/core/handoff-quality.ts` - Track pressure in scoring

---

## Timeline

- **Week 1**: Phase 1 complete (infrastructure)
- **Week 2**: Phase 2 complete (AI integration)
- **Week 3**: Phase 3 complete (handoff synthesis)
- **Week 4**: Phase 4 complete (pressure features, docs)

**Total**: 4 weeks to MVP, beta testing in parallel with Week 4
