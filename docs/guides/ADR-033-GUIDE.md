---
type: guide
status: current
updated: 2025-10-01
tags: [context-pressure, session-logging, implementation, adr-033]
related: [ADR-033-context-pressure-mitigation-strategy.md, ADR-033-implementation-plan.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 15-min
dependencies: [ADR-033]
---

# ADR-033 Implementation Guide

## Overview

This guide explains how to use the continuous session logging system implemented per ADR-033: Context Pressure Mitigation Strategy. The system captures insights throughout your session when context pressure is low, enabling high-quality handoffs even when called under pressure.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Using Session Logging](#using-session-logging)
4. [Interpreting Pressure Readings](#interpreting-pressure-readings)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Performance Considerations](#performance-considerations)

---

## Quick Start

### Starting a Session with Logging

```bash
# Start session (logging enabled by default)
ginko start

# Output:
# ✨ Session Ready!
# 📊 Context Pressure: 5% (optimal zone)
# 📝 Session logging enabled (use --no-log to disable)
```

### Checking Pressure During Work

```bash
ginko status

# Output:
# 📊 Context Pressure
#   Pressure: 45% ✅ (optimal zone)
#   Quality Estimate: 100%
#   💡 Continue working (optimal quality)
#
# 📝 Session Logging
#   Status: Active
#   Entries: 12
#   Files: 5
#   Avg Pressure: 38%
```

### Logging Events Manually

While the AI agent logs events automatically, you can also log manually:

```typescript
import { SessionLogManager, PressureMonitor } from '@ginko/cli/core';

// Log a significant event
await SessionLogManager.appendEntry(sessionDir, {
  timestamp: new Date().toISOString(),
  category: 'feature',
  description: 'Implemented user authentication with JWT tokens',
  files: ['src/auth/jwt.ts', 'src/middleware/auth.ts'],
  impact: 'high',
  context_pressure: PressureMonitor.getCurrentPressure()
});
```

---

## Architecture Overview

### Components

#### 1. PressureMonitor (`packages/cli/src/core/pressure-monitor.ts`)

Tracks context window utilization and provides quality estimates.

**Key Methods:**
- `getCurrentPressure()` - Returns 0-1 float representing utilization
- `getPressureZone()` - Returns 'optimal', 'degradation', or 'critical'
- `calculateQualityEstimate()` - Returns 0-100% quality estimate
- `getRecommendation()` - Returns actionable recommendation
- `shouldLogEvent()` - Returns true if pressure < 85%

**Pressure Zones:**
- **Optimal (0-50%)**: Full reasoning capacity, 100% quality
- **Degradation (50-85%)**: Noticeable compression, 85-95% quality
- **Critical (85-100%)**: Severe degradation, 40-65% quality

#### 2. SessionLogManager (`packages/cli/src/core/session-log-manager.ts`)

Manages continuous session logging for insight preservation.

**Key Methods:**
- `createSessionLog()` - Initialize new session log
- `appendEntry()` - Add event to log (atomic operation)
- `loadSessionLog()` - Read current log content
- `archiveLog()` - Move log to archive with timestamp
- `hasSessionLog()` - Check if log exists
- `getSummary()` - Get statistics from log

**Log Structure:**

```yaml
---
session_id: session-2025-10-01-14-30-00
started: 2025-10-01T14:30:00Z
user: dev@example.com
branch: feature/new-feature
context_pressure_at_start: 0.15
---

## Timeline
<!-- All events chronologically -->

## Key Decisions
<!-- Important decisions with rationale -->

## Files Affected
<!-- Modified files during session -->

## Insights
<!-- Patterns, gotchas, learnings -->

## Git Operations
<!-- Commits, merges, branch changes -->

## Achievements
<!-- Features completed, tests passing -->
```

### Integration Points

#### Commands Enhanced

1. **`ginko start`** (`packages/cli/src/commands/start/start-reflection.ts`)
   - Creates session log automatically
   - Initializes PressureMonitor
   - Displays initial pressure reading

2. **`ginko status`** (`packages/cli/src/commands/status.ts`)
   - Shows current pressure and zone
   - Displays logging statistics
   - Provides pressure-aware recommendations

3. **`ginko handoff`** (Phase 3)
   - Synthesizes handoff from session log
   - Archives log with timestamp
   - 80% content from logs, 20% current context

### Data Flow

```
Session Start
    ↓
Create Session Log
    ↓
[Work Happens]
    ↓
AI Logs Events ───→ SessionLogManager.appendEntry()
    |                        ↓
    |                Session Log Updated
    |                        ↓
    |                (Pressure still < 85%)
    ↓
[More Work]
    ↓
Pressure Increases
    ↓
ginko status ───→ Shows pressure warning
    ↓
(Pressure 85-95%)
    ↓
ginko handoff ───→ Synthesizes from session log
    ↓
Archive Session Log
    ↓
New Session
```

---

## Using Session Logging

### Automatic Logging (AI Agent)

The AI agent automatically logs significant events:

**Trigger Events:**
- File modifications (path, lines, purpose)
- Bug discoveries (error, root cause, fix)
- Key decisions (what, why, alternatives)
- Insights (patterns, gotchas, learnings)
- Git operations (commits, merges, branches)
- Achievements (features complete, tests passing)

**Log Entry Format:**

```markdown
### 14:30 - [feature]
Implemented user authentication with JWT tokens and refresh mechanism
Files: src/auth/jwt.ts:1-50, src/middleware/auth.ts:10-30
Impact: high | Pressure: 35%
```

### Manual Logging

For non-AI sessions or special events:

```typescript
import { SessionLogManager, PressureMonitor } from '@ginko/cli/core';
import path from 'path';

const userDir = path.join(ginkoDir, 'sessions', userSlug);

// Log a bug fix
await SessionLogManager.appendEntry(userDir, {
  timestamp: new Date().toISOString(),
  category: 'fix',
  description: 'Fixed race condition in payment processing causing duplicate charges',
  files: ['src/payments/processor.ts'],
  impact: 'high',
  context_pressure: PressureMonitor.getCurrentPressure()
});

// Log a decision
await SessionLogManager.appendEntry(userDir, {
  timestamp: new Date().toISOString(),
  category: 'decision',
  description: 'Chose PostgreSQL over MongoDB for ACID guarantees and complex queries',
  impact: 'high',
  context_pressure: PressureMonitor.getCurrentPressure()
});

// Log an insight
await SessionLogManager.appendEntry(userDir, {
  timestamp: new Date().toISOString(),
  category: 'insight',
  description: 'Discovered that Vercel serverless functions timeout at 10s on Hobby plan',
  impact: 'medium',
  context_pressure: PressureMonitor.getCurrentPressure()
});
```

### Disabling Logging

If you prefer not to use session logging:

```bash
ginko start --no-log
```

---

## Interpreting Pressure Readings

### Pressure Percentages

| Pressure | Zone | Quality | Recommendation |
|----------|------|---------|----------------|
| 0-50% | Optimal ✅ | 100% | Continue working (optimal quality) |
| 50-70% | Degradation ⚠️ | 95% | Quality still good - continue working |
| 70-85% | Degradation ⚠️ | 85% | Consider handoff soon to preserve quality |
| 85-95% | Critical 🔴 | 65% | Quality degrading - recommend handoff now |
| 95-100% | Critical 🔴 | 40% | Critical pressure - handoff strongly recommended |

### Quality Degradation Signs

**At 70-85% Pressure:**
- Shorter code examples
- Fewer alternatives suggested
- Less detailed explanations
- Reduced use of earlier context

**At 85-95% Pressure:**
- Generic, pattern-matched responses
- Unable to reference specifics from early session
- Repetitive suggestions
- "As mentioned earlier..." without detail

**At 95-100% Pressure:**
- Auto-compact may trigger
- Major context loss
- Disjointed responses
- Quality collapse

### When to Call Handoff

**Optimal Timing:**
- At 75-85% pressure
- After completing a feature
- Before context switching
- End of work session

**Too Late:**
- At 95%+ pressure
- After quality degradation noticed
- When AI gives generic responses

**Benefits of Early Handoff:**
- Higher quality synthesis
- Better insight preservation
- Smoother session continuity
- More useful for next developer

---

## Best Practices

### 1. Monitor Pressure Regularly

```bash
# Check pressure every 30-60 minutes
ginko status

# Or add to your shell prompt (bash/zsh)
function ginko_pressure() {
  cd /path/to/project && ginko status | grep "Pressure:" | awk '{print $2}'
}
```

### 2. Log Early and Often

- Log immediately after significant events
- Don't wait until high pressure
- Include context while it's fresh
- Be concise but specific (1-2 sentences)

### 3. Work Mode Awareness

Adjust logging frequency based on work mode:

**Hack & Ship Mode:**
- Minimal logging
- Focus on achievements and blockers
- Quick handoffs

**Think & Build Mode:**
- Balanced logging
- Capture decisions and patterns
- Regular handoffs

**Deep Work Mode:**
- Comprehensive logging
- Detailed insights and rationale
- Thorough handoffs

### 4. Pressure-Aware Workflow

```
Start Session (5% pressure)
    ↓
Work on Feature 1 (25% pressure)
    ↓
Complete Feature 1 (45% pressure)
    ↓
Work on Feature 2 (65% pressure)
    ↓
Complete Feature 2 (80% pressure)
    ↓
[OPTIMAL HANDOFF POINT]
    ↓
ginko handoff
    ↓
New Session (5% pressure)
```

### 5. Integration with Existing Workflow

```bash
# Morning: Start session
ginko start

# Throughout day: Check pressure
ginko status

# End of day: Handoff
ginko handoff "Completed user auth, starting payment integration tomorrow"

# Next morning: Resume
ginko start  # Loads previous handoff automatically
```

---

## Troubleshooting

### Session Log Not Created

**Problem:** `ginko status` shows "Session logging: Not initialized"

**Solution:**
```bash
# Manually initialize
ginko start

# Or check if disabled
ginko start --no-log  # This disables logging
ginko start           # This enables it
```

### Pressure Always Shows 0%

**Problem:** Pressure reading stuck at 0%

**Cause:** PressureMonitor not tracking tokens

**Solution:**
- Pressure estimates are rough heuristics
- Actual pressure comes from Claude API in production
- For testing, manually update:

```typescript
PressureMonitor.updateEstimatedTokens(50000); // ~25% of 200k
```

### Log Entries Not Appearing

**Problem:** Logged events don't show in `ginko status`

**Solution:**
1. Check log file exists: `.ginko/sessions/[user]/current-session-log.md`
2. Verify entry format matches expected structure
3. Check file permissions (should be readable/writable)

### Handoff Quality Still Poor

**Problem:** Handoffs are generic despite logging

**Causes:**
- Logging started too late (after 85% pressure)
- Log entries too vague or brief
- Not enough context in entries

**Solution:**
- Start logging earlier in session
- Include specific file names and line numbers
- Add "why" not just "what"
- Reference related decisions and patterns

---

## Performance Considerations

### Token Usage

**Session Logging Impact:**
- Log creation: ~500 tokens
- Per entry: ~50-100 tokens
- Handoff synthesis: ~1000-1500 tokens

**Savings:**
- Traditional handoff: ~3000-5000 tokens
- With session log: ~1000-2000 tokens
- **Net savings: ~1000-2500 tokens per session (40-50% reduction)**

### File I/O

**Atomic Operations:**
- All log writes are atomic (no corruption)
- Uses `fs.writeFile` with complete content replacement
- Safe for concurrent sessions (different users)

**Performance:**
- Log file size: ~50-200 KB per session
- Read time: <10ms
- Write time: <20ms
- Archive time: <50ms

### Memory Usage

**PressureMonitor:**
- Static class (no instances)
- Memory footprint: ~1 KB
- No cleanup needed

**SessionLogManager:**
- Static methods only
- Reads files on demand (not cached)
- Memory footprint: ~2 KB
- No persistent state

---

## Advanced Usage

### Custom Pressure Thresholds

```typescript
// Adjust thresholds for your workflow
PressureMonitor.setMaxTokens(150000); // Shorter context window

// Check if logging recommended
if (PressureMonitor.shouldLogEvent()) {
  await SessionLogManager.appendEntry(/* ... */);
}
```

### Session Log Analysis

```typescript
const logContent = await SessionLogManager.loadSessionLog(userDir);
const summary = SessionLogManager.getSummary(logContent);

console.log(`Total entries: ${summary.totalEntries}`);
console.log(`Files affected: ${summary.filesAffected}`);
console.log(`Average pressure: ${(summary.avgPressure * 100).toFixed(0)}%`);

// Category breakdown
for (const [category, count] of Object.entries(summary.byCategory)) {
  console.log(`${category}: ${count} entries`);
}
```

### Multi-Session Continuity

```typescript
// Archive with handoff summary
const archivePath = await SessionLogManager.archiveLog(
  userDir,
  'Completed Phase 1 of feature implementation'
);

// New session
await SessionLogManager.createSessionLog(userDir, userEmail, currentBranch);

// Previous logs available in archive
const archiveDir = path.join(userDir, 'archive');
const previousLogs = await fs.readdir(archiveDir);
```

---

## Related Documentation

- [ADR-033: Context Pressure Mitigation Strategy](ADR-033-context-pressure-mitigation-strategy.md)
- [Session Logging Example](../examples/session-logging-example.md)
- [Context Pressure Management](../context-pressure-management.md)
- [CLAUDE.md: Session Logging Best Practices](../../CLAUDE.md#session-logging-best-practices)

---

## Support

For issues, questions, or contributions related to ADR-033 implementation:

1. Check this guide first
2. Review troubleshooting section
3. Examine session log file structure
4. File issue with: pressure reading, log content, command output

**Common Questions:**
- Q: Does logging slow down my workflow?
  - A: No, logging is async and takes <20ms per entry
- Q: Can I use this in CI/CD?
  - A: Yes, use `--no-log` flag for automated sessions
- Q: What if I forget to handoff?
  - A: Log is preserved until next handoff; no data loss

---

*Last updated: 2025-10-01*
*Implementation: Phase 4 - Pressure-Aware Features*
