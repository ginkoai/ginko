# AI-UX Principles: Designing for Human-AI Collaboration

## Overview

This document captures the principles for balancing Human UX and AI UX in Ginko. The core insight: **humans and AI partners have fundamentally different needs from the same underlying data**.

**Created**: 2025-11-24 (TASK-11)
**Status**: Living document

---

## The Dual Output Problem

When `ginko start` runs, it must serve two distinct audiences:

| Aspect | Human Developer | AI Partner |
|--------|-----------------|------------|
| **Goal** | Get into flow state fast | Understand full context |
| **Attention** | 6-8 lines scannable | 100+ lines parseable |
| **Format** | Colors, emojis, whitespace | Structured JSON |
| **Time budget** | <2 seconds to read | Tokens matter, not time |
| **Key question** | "What do I do next?" | "What is the full picture?" |

---

## The Solution: Dual Output System

Ginko implements a **dual output system** that separates concerns:

### 1. Human Output (Console)

Concise, scannable, action-oriented. Maximum 6-8 lines.

```
🔥 Think & Build | Flow: 10/10 | main
📋 Active Sprint: ████████░░░░░░░░░░░░ 40%
   [@] TASK-11: Human UX vs AI UX Balance
⚡ Resume: Implementing dual output system for session start
   $ npm run build
📝 5 uncommitted changes

Ready to build! Use ginko log to capture insights
```

**Principles**:
- First line: Mode + flow state + branch
- Second line: Current task (the ONE thing to do)
- Third line: Resume point (what to do next)
- Fourth line: Command to run
- Fifth line: Blockers or warnings (if any)
- Sixth line: Ready message

### 2. AI Context (File/MCP)

Rich, structured, complete. Stored in `.ginko/sessions/[user]/current-context.jsonl`.

```json
{
  "session": { "flowScore": 10, "workMode": "Think & Build" },
  "charter": { "purpose": "...", "goals": [...] },
  "teamActivity": { "decisions": [...], "achievements": [...] },
  "patterns": [...],
  "sprint": { "currentTask": {...}, "progress": 40 },
  "synthesis": { "resumePoint": "...", "nextAction": "..." },
  "git": { "uncommittedChanges": [...] },
  "metrics": { "eventsLoaded": 50, "tokenEstimate": 5000 }
}
```

**Principles**:
- Include EVERYTHING the AI needs
- Structured for parsing, not reading
- Complete context without truncation
- Metadata for reasoning (metrics, timestamps)

---

## Design Principles

### 1. Separate but Equal

Human output and AI context are **equally important**, just different. Neither is a "dumbed down" or "enhanced" version of the other. They're parallel outputs optimized for different consumers.

### 2. Same Source of Truth

Both outputs are generated from the **same underlying data**. The `buildAIContext()` function creates a structured object that feeds both:
- `formatHumanOutput()` for console
- `formatAIContextJSONL()` for storage

### 3. Progressive Disclosure for Humans

Human output shows:
1. **Must know** (mode, current task, next action)
2. **Should know** (blockers, warnings)
3. **Could know** (via `--verbose` flag)

AI context shows everything always.

### 4. Verbose Mode Bridges the Gap

The `--verbose` flag shows AI context in console format, useful for:
- Debugging what the AI sees
- Understanding context loading
- Verifying charter/team/pattern data

### 5. Action-Orientation for Humans

Human output answers: **"What should I do RIGHT NOW?"**

- ✅ `[@] TASK-11: Human UX vs AI UX Balance`
- ❌ `You have 4 tasks in the sprint`

- ✅ `$ npm run build`
- ❌ `Consider running the build command`

### 6. Context-Orientation for AI

AI context answers: **"What is the full situation?"**

Include:
- Project mission (charter)
- Team coordination (decisions, achievements)
- Historical patterns and gotchas
- Current sprint and task details
- Git state and warnings
- Loading metrics

---

## Implementation Reference

### Files

- `packages/cli/src/lib/output-formatter.ts` - Dual output formatting
- `packages/cli/src/commands/start/start-reflection.ts` - buildAIContext()
- `.ginko/sessions/[user]/current-context.jsonl` - Stored AI context

### CLI Flags

- `--concise` / `-c` - Force human-optimized output (6-8 lines)
- `--verbose` / `-v` - Show AI context in console (debugging)
- Default: Full session info with all sections

### Key Functions

```typescript
// Build structured context for both outputs
buildAIContext(context, synthesis, strategyContext, eventContext, sprintChecklist): AISessionContext

// Generate human-readable output
formatHumanOutput(aiContext, config): string

// Generate verbose AI context display
formatVerboseOutput(aiContext): string

// Generate JSONL for storage
formatAIContextJSONL(aiContext): string
```

---

## When to Prioritize Human vs AI

### Prioritize Human UX When:
- Output is displayed in terminal
- User is scanning for immediate action
- Time to read matters (startup latency)
- Cognitive load is a concern

### Prioritize AI UX When:
- Context is consumed by AI partner
- Completeness matters more than brevity
- Data will be parsed programmatically
- Historical context is needed

### Balance Both When:
- Building session summaries
- Creating handoff documents
- Designing event logging output
- Implementing status commands

---

## Anti-Patterns to Avoid

### 1. Information Dumping
❌ Showing all 50 events in console output
✅ Show count + 3 most relevant items

### 2. False Brevity
❌ Removing context AI needs to save tokens
✅ Use structured format, let AI decide relevance

### 3. Verbose-by-Default
❌ Showing AI context unless `--quiet`
✅ Concise by default, verbose opt-in

### 4. Single Output Compromise
❌ One output that satisfies neither audience
✅ Two distinct outputs optimized for each

### 5. Inconsistent Data
❌ Human sees different data than AI
✅ Same source, different formatting

---

## Success Metrics

### Human UX
- Time to read output: <2 seconds
- Lines of output: 6-8 (concise mode)
- Questions answered: "What do I do next?"

### AI UX
- Context completeness: 100% of relevant data
- Parse success: Valid JSON always
- Token efficiency: Only essential context

### Overall
- Flow state achieved: <30 seconds after `ginko start`
- Context loss: Zero (AI has everything)
- User preference: "Can't imagine working without it"

---

## Future Considerations

1. **MCP Integration**: AI context could be served via MCP for real-time access
2. **Context Compression**: Smart summarization for very large contexts
3. **Adaptive Verbosity**: Adjust based on user preferences learned over time
4. **Team Contexts**: Different team members see relevant subsets

---

*This document is part of EPIC-001: Strategic Context & Dynamic Adaptivity*
