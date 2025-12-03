---
title: "Patterns and Gotchas: Teaching Your AI Partner"
date: 2025-12-26
author: Chris Norton
description: "Your codebase has patterns that work and pitfalls to avoid. Here's how to teach them to your AI assistant so it stops making the same mistakes."
slug: "patterns-and-gotchas"
tags: ["ai-collaboration", "patterns", "best-practices", "developer-tools"]
---

# Patterns and Gotchas: Teaching Your AI Partner

Every codebase has tribal knowledge—the patterns that work, the approaches that don't, the weird edge cases that burned someone three sprints ago. This knowledge usually lives in developers' heads, surfacing only when someone's about to make a mistake.

"Oh, don't use setTimeout there—it'll keep the process alive."

"We tried that approach last month. It doesn't scale."

"Make sure you call .unref() on that timer or the tests will hang."

Your AI assistant doesn't have access to this tribal knowledge. It suggests the obvious solution, not knowing that your team learned the hard way why that doesn't work here. You catch the mistake, explain why, and move on. Next session? The AI suggests the same thing again.

What if your AI could actually learn from your team's experience?

## The Pattern Problem

Patterns are the solutions that work well in your specific context. They're not universal best practices—they're the approaches your team has validated through real usage.

Some examples:

**Retry Pattern**: "When calling external APIs, use exponential backoff with jitter. Start at 100ms, max 3 retries, cap at 2 seconds."

**Output Formatter Pattern**: "All CLI output goes through the dual formatter—human-readable to console, structured JSON to the context file."

**Event Queue Pattern**: "Background syncs use the event queue with a 5-minute interval and 5-event threshold for batching."

These patterns emerge from your codebase. They're proven. They're consistent. And they should inform how your AI assistant suggests solutions.

## The Gotcha Problem

Gotchas are the inverse—the mistakes that look reasonable but cause problems. Every team accumulates these through painful experience:

**Timer Gotcha**: "Node.js timers (setInterval, setTimeout) keep the event loop alive. Always call .unref() on timers in CLI tools, or the process won't exit."

**Verbose Output Gotcha**: "Don't dump full context to the console. Users get overwhelmed. Use the formatter's truncate function."

**Async Cleanup Gotcha**: "In tests, always await cleanup functions. Unhandled promises cause flaky test failures that are nearly impossible to debug."

These gotchas cost hours when you hit them. They cost more hours when someone else hits them later because the knowledge wasn't captured.

## How Ginko Captures Patterns and Gotchas

When you're working with ginko, pattern and gotcha capture happens naturally:

### During Development

You solve a tricky problem. Instead of just moving on, you log it:

```bash
ginko log "Fixed EventQueue timer hanging process. Root cause: setInterval
without .unref() keeps Node event loop alive. Solution: timer.unref()
allows clean exit. Reduced startup from 90s to 2s." --category=fix
```

Ginko extracts the pattern or gotcha automatically. The timer gotcha is now documented with context, cause, and solution.

### Through Sprint Tasks

When you define sprint tasks, you can reference patterns and gotchas:

```markdown
### TASK-7: Optimize Event Queue

Use the retry-pattern from src/utils/api-client.ts for resilient calls.
Apply the output-formatter-pattern for dual output.

Avoid the timer-unref-gotcha that causes process hang.
Watch out for verbose-output issues.
```

When someone starts this task, ginko surfaces the relevant context:

```
Next up: TASK-7 - Optimize Event Queue (start)

Sprint: Performance Sprint 45%
  Apply: retry-pattern ★, output-formatter-pattern ◐
  Avoid: 💡 timer-unref-gotcha, 💡 verbose-output-gotcha
```

The patterns tell you *what to do*. The gotchas tell you *what not to do*. Both come from your team's real experience.

## Confidence Levels

Not all patterns are equally proven. Ginko tracks confidence based on usage:

- **★ High confidence**: Pattern used successfully in 3+ places
- **◐ Medium confidence**: Pattern used in 1-2 places, promising
- **○ Low confidence**: Newly documented, needs validation

Similarly, gotchas have severity levels:

- **🚨 Critical**: Causes data loss or security issues
- **⚠️ High**: Causes significant bugs or outages
- **💡 Medium/Low**: Causes inconvenience or minor issues

This helps you prioritize. A high-confidence pattern is safe to apply widely. A critical gotcha demands immediate attention.

## Building Your Pattern Library

Start simple. You don't need to document everything upfront. Capture patterns as they prove valuable:

### When You Solve a Recurring Problem

If you've solved the same type of problem twice, it's a pattern:

```bash
ginko log "API retry pattern: exponential backoff starting at 100ms,
max 3 attempts, jitter to prevent thundering herd. Used in auth-client
and data-sync." --category=insight
```

### When You Hit a Non-Obvious Bug

If the fix wasn't obvious, document it:

```bash
ginko log "Gotcha: Next.js App Router caches fetch() by default.
Add { cache: 'no-store' } for dynamic data. Cost us 2 hours debugging
stale data issues." --category=insight
```

### When You Make an Architecture Decision

Decisions are patterns waiting to happen:

```bash
ginko log "Decision: Using cursor-based pagination over offset-based.
Scales better with large datasets, consistent results during updates.
Trade-off: slightly more complex client code." --category=decision
```

## Team Knowledge Amplification

The magic happens when patterns and gotchas flow across your team:

**Monday**: Alice hits a weird timer bug. Spends 2 hours debugging. Documents the gotcha.

**Wednesday**: Bob starts a related task. Ginko shows: "Avoid: 💡 timer-unref-gotcha"

**Wednesday**: Bob avoids 2 hours of debugging. Ships feature on time.

**Next Month**: New hire Carol sees the same gotcha surfaced during onboarding. The tribal knowledge transfers without a meeting.

This is compound interest on documentation. Every gotcha documented saves time for everyone who comes after.

## Practical Tips

**Keep it specific**: "Use retry logic" is too vague. "Exponential backoff, 100ms start, 3 max attempts, jitter" is actionable.

**Include the why**: Patterns without rationale get ignored. Explain the trade-offs.

**Reference the code**: "See src/utils/retry.ts for implementation" makes patterns concrete.

**Update when wrong**: Patterns evolve. If you find a better approach, update the documentation.

**Don't over-document**: Not everything is a pattern. Focus on recurring solutions and painful gotchas.

## Getting Started

```bash
# Log a pattern you just discovered
ginko log "Pattern: [description with context and rationale]" --category=insight

# Log a gotcha you just hit
ginko log "Gotcha: [what happened, why, and how to avoid]" --category=fix

# See patterns for your current task
ginko start  # Shows Apply: and Avoid: sections
```

Your AI assistant will never have the intuition that comes from hitting bugs at 2 AM. But with captured patterns and gotchas, it can at least benefit from the lessons your team has learned.

---

*Stop re-teaching your AI the same lessons. [Ginko](https://ginkoai.com) captures patterns and gotchas so your whole team—human and AI—can learn from experience.*
