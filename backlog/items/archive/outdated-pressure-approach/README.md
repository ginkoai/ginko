# Archived: Outdated Pressure Measurement Approach

**Date Archived:** 2025-10-15
**Reason:** Based on flawed context pressure measurement approach

## Context

These features were created based on the assumption that we needed to:
- Measure context pressure via token counting
- Integrate ginko CLI with Claude Code's token metrics
- Provide real-time pressure warnings

## Why Archived

**The Real Solution (ADR-033 Event-Based Defensive Logging):**

Context pressure impacts AI performance, but metrics are:
- Not readily available
- Subject to vendor changes
- Vary from vendor to vendor

**Better Approach:**
- Recognize context pressure happens
- Behave defensively by logging key events at session start
- Synthesize full picture at next session start when AI reasoning is at maximum
- Already implemented in `ginko start` command

## Archived Items

1. **FEATURE-030.md** - Empty placeholder (test)
2. **FEATURE-031.md** - Test placeholder
3. **FEATURE-032.md** - Feature detection for CLI staleness
   - Valid UX concern (shell persistence after npm install)
   - But proposed detection based on pressure measurements
   - May revisit as pure UX feature without pressure dependency
4. **FEATURE-033.md** - Context pressure integration with Claude Code
   - Entirely based on flawed measurement approach
   - Not needed with defensive logging strategy

## What Actually Works

See ADR-033 and the current implementation:
- `packages/cli/src/commands/start/start-reflection.ts`
- `packages/cli/src/core/session-log-manager.ts`
- Defensive event logging throughout session
- Synthesis at next `ginko start`

---

*If you're reading this in the future and think we need pressure measurement again, first review ADR-033 and ask: "Why isn't defensive logging sufficient?"*
