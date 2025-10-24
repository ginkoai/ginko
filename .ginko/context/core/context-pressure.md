---
module: context-pressure
type: core-knowledge
status: active
updated: 2025-10-23
tags: [context-pressure, session-logging, adr-033, quality, flow-state]
priority: critical
audience: [ai-agent]
estimated-tokens: 400
---

# Context Pressure Management

## Quick Reference

**Context Pressure** = AI quality degradation as conversation context window fills

**Key Insight**: Capture insights at low pressure (20-80%), synthesize at high pressure (85-95%)

**Commands**:
- `ginko start` - Initialize session (synthesizes previous session)
- `ginko log "message"` - Log event during session
- `ginko handoff` - Synthesize from logs (optional, automatic on next start)

## The Problem

Traditional workflow:
```
Work until context full (95%) → Call handoff → Poor quality (40%)
```

**Why**: AI reasoning degrades as context saturates. Handoffs called when quality is worst.

## The Solution (ADR-033)

Continuous session logging:
```
Log at low pressure (20-80%) → Work more → Handoff at high pressure (85%) → Good quality (85%)
```

**Why**: Insights captured when quality high, synthesized when quality low.

## Session Logging Workflow

**1. Start session:**
```bash
ginko start  # Loads previous logs, synthesizes context
```

**2. Log important events as you work:**
```bash
# After fixing a bug
ginko log "Fixed auth timeout. Root cause: bcrypt rounds too high. Reduced to 11." --category=fix

# After implementing a feature
ginko log "Added always-load module system. Loads 3-7 core modules by work mode." --category=feature

# After making a decision
ginko log "Chose Markdown over JSON for logs. Better readability and git diffs." --category=decision

# After discovering insight
ginko log "Found Set objects don't serialize. Use Array.from() instead." --category=insight
```

**3. Continue working** - No need to call handoff manually

**4. Next session:**
```bash
ginko start  # Automatically synthesizes from previous logs
```

## When to Log

Log after these events:
- ✅ **Fixing bugs** - Error discovered, root cause, solution
- ✅ **Implementing features** - What was added, why needed
- ✅ **Making decisions** - What decided, why, alternatives
- ✅ **Discovering insights** - Gotchas, patterns, optimizations
- ✅ **Git operations** - Commits, merges, branch changes
- ✅ **Achievements** - Features complete, tests passing

**Frequency**: 5-10 log entries per session

## Quality Guidelines

**Good logging** (includes WHY and root cause):
```bash
ginko log "Fixed authentication timeout in login flow. Root cause: bcrypt rounds set to 15 (too slow for production load). Reduced to 11, achieving 200ms response time while maintaining security." \
  --category=fix --impact=high --files="src/auth/login.ts:42-50"
```

**Bad logging** (too terse, missing context):
```bash
ginko log "Fixed auth timeout" --category=fix
```

**Write for future AI with zero context** - Include WHAT, WHY, HOW, WHERE.

## Pressure Awareness

**Context usage zones:**
- 0-20%: Fresh start
- 20-60%: Optimal working zone (best logging quality)
- 60-80%: Still good quality
- 80-90%: Quality degrading (complete current task)
- 90-95%: Critical (finish and start new session)
- 95-100%: Emergency (quality severely degraded)

**Current session (this conversation):**
- Messages: ~90k tokens (45%)
- Free space: ~67k tokens (33.5%)
- Auto-compact buffer: 45k tokens (22.5%)
- **Status**: Optimal working zone

## Benefits

1. **Higher Quality Handoffs** - Rich detail captured at low pressure
2. **Reduced Token Usage** - Synthesis requires fewer tokens than generation
3. **Timeline Preservation** - Exact chronology of decisions
4. **Team Learning** - Other developers can review session logs
5. **Context Continuity** - Future sessions benefit from insights

## Related

- Full documentation: `.ginko/context/modules/context-pressure-management.md`
- ADR: `docs/adr/ADR-033-context-pressure-mitigation-strategy.md`
- Implementation: `packages/cli/src/core/session-log-manager.ts`
