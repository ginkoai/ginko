---
module: context-pressure-management
type: architectural-pattern
status: active
updated: 2025-10-01
tags: [context-pressure, quality-degradation, session-logging, adr-033, ai-optimization]
related: [ADR-033-context-pressure-mitigation-strategy.md, session-logging.md]
priority: critical
audience: [ai-agent, developer]
estimated-read: 5-min
applies-to: [all-ai-sessions, handoff-command, status-command]
---

# Context Pressure Management

## Quick Reference

**Context Pressure** = AI quality degradation as conversation context window fills

**Key Insight**: Capture insights at low pressure (20-80%), synthesize at high pressure (85-95%)

**Commands**:
- `ginko status` - Check current pressure
- `ginko start` - Initialize session logging
- `ginko handoff` - Synthesize from logs

---

## Core Concept

### The Problem

Traditional AI workflow:
```
Work until context full (95%) → Call handoff → Poor quality (40%)
```

**Why**: AI reasoning degrades as context saturates. Handoffs called when quality is worst.

### The Solution (ADR-033)

Continuous session logging:
```
Log at low pressure (20-80%) → Work more → Handoff at high pressure (85%) → Good quality (85%)
```

**Why**: Insights captured when quality high, synthesized when quality low.

---

## Pressure Zones

| Pressure | Zone | Quality | Behavior |
|----------|------|---------|----------|
| 0-50% | Optimal ✅ | 100% | Full reasoning, deep analysis, complete examples |
| 50-85% | Degradation ⚠️ | 85-95% | Compression begins, shorter examples |
| 85-100% | Critical 🔴 | 40-65% | Generic responses, quality collapse |

### Recognition Patterns

**At Optimal (0-50%)**:
- Detailed explanations
- Multiple approaches considered
- Complete code examples
- Historical context referenced

**At Degradation (50-85%)**:
- Shorter responses
- Single approach focus
- Abbreviated examples
- "As mentioned earlier..." without detail

**At Critical (85-100%)**:
- Generic responses
- "See the docs" suggestions
- Inability to reference early session
- Repetitive patterns

---

## Implementation Architecture

### Components

#### 1. PressureMonitor
**Location**: `packages/cli/src/core/pressure-monitor.ts`

**Purpose**: Track context utilization and estimate quality

**Key Methods**:
```typescript
PressureMonitor.getCurrentPressure()      // Returns 0-1
PressureMonitor.getPressureZone()         // Returns zone
PressureMonitor.calculateQualityEstimate() // Returns 0-100%
PressureMonitor.getRecommendation()       // Returns action
```

#### 2. SessionLogManager
**Location**: `packages/cli/src/core/session-log-manager.ts`

**Purpose**: Manage continuous event logging

**Key Methods**:
```typescript
SessionLogManager.createSessionLog()  // Initialize on start
SessionLogManager.appendEntry()       // Log event
SessionLogManager.loadSessionLog()    // Read log
SessionLogManager.archiveLog()        // Save on handoff
```

### Integration Points

**`ginko start`**:
1. Creates session log
2. Initializes PressureMonitor
3. Displays pressure (5% at start)

**`ginko status`**:
1. Shows current pressure
2. Displays quality estimate
3. Provides recommendations
4. Shows log statistics

**`ginko handoff`** (Phase 3):
1. Loads session log
2. Synthesizes from entries (80%)
3. Adds current context (20%)
4. Archives log with timestamp

---

## Usage Patterns

### Pattern 1: Feature Development

```
09:00 - Start (5% pressure)
    ↓
09:30 - Log decision (20% pressure)
    ↓
10:30 - Log feature (45% pressure)
    ↓
11:30 - Log insight (68% pressure)
    ↓
12:00 - Check status (76% pressure)
    ↓
12:15 - Handoff (82% pressure)
```

**Result**: High-quality handoff despite 82% pressure

### Pattern 2: Debugging Session

```
14:00 - Start (5% pressure)
    ↓
14:30 - Log investigation (35% pressure)
    ↓
15:00 - Log root cause (55% pressure)
    ↓
15:30 - Log fix (72% pressure)
    ↓
16:00 - Log verification (85% pressure)
    ↓
16:10 - Handoff immediately
```

**Result**: Fix context preserved before critical pressure

---

## Decision Rationale

### Why Continuous Logging?

**Problem**: Handoffs called at worst possible time (95% pressure)

**Solution**: Log throughout session when quality is high

**Evidence**:
- Traditional handoff quality: 40% at 95% pressure
- Logged handoff quality: 85% at 85% pressure
- Improvement: +45% quality, -10% pressure

### Why These Pressure Thresholds?

**0-50% (Optimal)**:
- Empirically observed: Full reasoning capacity
- No compression in responses
- Complete code examples

**50-85% (Degradation)**:
- Noticeable but manageable compression
- Still useful for implementation
- Good for logging

**85-100% (Critical)**:
- Rapid quality degradation
- Generic responses
- Poor handoff quality

### Why 6 Log Categories?

Categories chosen for complete session coverage:
- **feature**: What was built
- **fix**: What was broken and fixed
- **decision**: Why choices were made
- **insight**: What was learned
- **git**: What was committed
- **achievement**: What was completed

---

## Code Examples

### Logging from AI Agent

```typescript
import { SessionLogManager, PressureMonitor } from '@ginko/cli/core';

// After implementing feature
await SessionLogManager.appendEntry(sessionDir, {
  timestamp: new Date().toISOString(),
  category: 'feature',
  description: 'Implemented JWT authentication with token rotation',
  files: ['src/auth/jwt.ts:1-120', 'src/middleware/auth.ts'],
  impact: 'high',
  context_pressure: PressureMonitor.getCurrentPressure()
});

// After discovering insight
await SessionLogManager.appendEntry(sessionDir, {
  timestamp: new Date().toISOString(),
  category: 'insight',
  description: 'bcrypt rounds 10-11 provide optimal security/performance balance',
  impact: 'medium',
  context_pressure: PressureMonitor.getCurrentPressure()
});
```

### Checking Pressure

```typescript
// Get current reading
const reading = PressureMonitor.getPressureReading();

console.log(`Pressure: ${(reading.pressure * 100).toFixed(0)}%`);
console.log(`Zone: ${reading.zone}`);
console.log(`Quality: ${reading.qualityEstimate}%`);
console.log(`Recommendation: ${reading.recommendation}`);

// Determine if should log
if (PressureMonitor.shouldLogEvent()) {
  await SessionLogManager.appendEntry(/* ... */);
}
```

---

## Best Practices for AI Agents

### When to Log

**After every significant event**:
- File modifications (implementation, refactoring)
- Bug fixes (root cause identified, solution implemented)
- Decisions (architecture, libraries, trade-offs)
- Insights (patterns, gotchas, learnings)
- Git operations (commits, merges)
- Achievements (features complete, tests passing)

**Frequency by work mode**:
- Hack & Ship: Every 60-90 minutes
- Think & Build: Every 30-45 minutes
- Deep Work: Every 20-30 minutes

### How to Write Entries

**Be Specific**:
```
Good: "Implemented JWT authentication with RS256 signing and 15-minute expiry"
Bad: "Added auth"
```

**Include Files**:
```
Good: "Files: src/auth/jwt.ts:1-120, src/middleware/auth.ts:40-85"
Bad: "Files: auth files"
```

**Capture "Why"**:
```
Good: "Chose PostgreSQL over MongoDB for ACID guarantees in financial transactions"
Bad: "Using PostgreSQL"
```

### Pressure-Aware Behavior

**At 0-50% Pressure**:
- Log detailed insights
- Capture architectural decisions
- Document alternatives considered
- Full rationale for choices

**At 50-85% Pressure**:
- Continue logging
- Focus on files and changes
- Brief rationale
- Essential context only

**At 85%+ Pressure**:
- Stop logging (poor quality)
- Recommend handoff
- Focus on synthesis from existing logs

---

## Performance Characteristics

### Token Usage

- **Session log creation**: ~500 tokens
- **Per entry append**: ~50-100 tokens
- **Handoff synthesis**: ~1000-1500 tokens

**Comparison**:
- Traditional handoff: ~3500 tokens
- With session logging: ~1500 tokens
- **Savings**: 40-50% reduction

### File I/O

- **Log file size**: 50-200 KB per session
- **Read time**: <10ms
- **Write time**: <20ms
- **Archive time**: <50ms

**All operations atomic** (no corruption risk)

### Memory

- **PressureMonitor**: ~1 KB (static class)
- **SessionLogManager**: ~2 KB (static methods)
- **Total overhead**: Negligible

---

## Troubleshooting

### Pressure Shows 0% Always

**Cause**: Client-side heuristic estimation
**Solution**: Actual pressure requires Claude API token counts (production)
**Workaround**: `PressureMonitor.updateEstimatedTokens(50000)`

### Handoff Quality Still Poor

**Causes**:
1. Logging started too late (>85% pressure)
2. Log entries too vague
3. Insufficient logging frequency
4. Missing key categories

**Solutions**:
1. Log earlier in session (20-80%)
2. Include specific files and line numbers
3. Log every 30-60 minutes
4. Use all 6 categories

### Log Not Created

**Cause**: Session log not initialized
**Solution**: Run `ginko start` to create log
**Check**: `.ginko/sessions/[user]/current-session-log.md`

---

## Evolution and Future Work

### Current Implementation (Phase 4)

- Pressure monitoring in status command
- Session logging in start command
- Manual/AI logging support
- Documentation and examples

### Future Enhancements

**Phase 5: Handoff Synthesis**
- Integrate logs into handoff command
- 80/20 synthesis from logs/context
- Quality comparison metrics

**Phase 6: AI Protocol**
- Automatic logging triggers
- Pressure-aware behavior changes
- Quality degradation detection

**Phase 7: Tooling**
- IDE extensions (VS Code, Cursor)
- Real-time pressure visualization
- Auto-handoff suggestions

---

## References

### Documentation

- [ADR-033: Context Pressure Mitigation Strategy](../../docs/adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-033 Implementation Guide](../../docs/adr/ADR-033-implementation-guide.md)
- [Session Logging Example](../../docs/examples/session-logging-example.md)
- [Context Pressure Management](../../docs/context-pressure-management.md)

### Code

- `packages/cli/src/core/pressure-monitor.ts`
- `packages/cli/src/core/session-log-manager.ts`
- `packages/cli/src/commands/status.ts`
- `packages/cli/src/commands/start/start-reflection.ts`

---

## Quick Wins

**For AI Agents**:
1. Check pressure with `PressureMonitor.getCurrentPressure()`
2. Log after every significant event
3. Include specific files and line numbers
4. Recommend handoff at 75-85% pressure

**For Developers**:
1. Run `ginko status` every 30-60 minutes
2. Trust pressure warnings
3. Handoff at 75-85%, not 95%+
4. Review session logs before next session

**For Teams**:
1. Establish pressure thresholds per work mode
2. Track handoff quality metrics
3. Review archived logs for patterns
4. Incorporate into workflow documentation

---

*Last updated: 2025-10-01*
*Part of ADR-033 implementation (Phase 4)*
*Module active for all AI-assisted sessions*
