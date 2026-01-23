# Ginko - AI Agent Collaboration Guide

This file provides instructions for AI assistants (non-Claude models) working with the Ginko collaboration system.

## Quick Start

When starting a session, run:
```bash
ginko start
```

This loads your context, shows the current sprint, and identifies your next task.

## Task Completion Protocol

**After completing ANY sprint task, you MUST update the graph:**

```bash
ginko task complete <task_id>
```

**Example workflow:**
1. Start task: `ginko task start e014_s02_t01`
2. Do the work
3. **Complete task: `ginko task complete e014_s02_t01`**

**Why this matters:**
- `ginko start` shows the next task based on graph status
- Uncommitted task completions cause stale suggestions
- Team visibility depends on accurate task status

## Task Status Commands

| Command | Effect |
|---------|--------|
| `ginko task start <id>` | Mark as in_progress |
| `ginko task complete <id>` | Mark as complete |
| `ginko task block <id> "reason"` | Mark as blocked |
| `ginko task pause <id>` | Return to not_started |

**Cascade option:** When completing the last task in a sprint:
```bash
ginko task complete e014_s02_t07 --cascade
```

## Essential Commands

| Command | Purpose |
|---------|---------|
| `ginko start` | Begin session, load context |
| `ginko handoff` | Save progress for next session |
| `ginko sync` | Pull team updates from dashboard |
| `ginko status` | Quick project status check |

## Entity Naming Convention

| Entity | Format | Example |
|--------|--------|---------|
| Epic | `e{NNN}` | `e005` |
| Sprint | `e{NNN}_s{NN}` | `e005_s01` |
| Task | `e{NNN}_s{NN}_t{NN}` | `e005_s01_t01` |

## Graph Queries

```bash
# Semantic search
ginko graph query "authentication patterns"

# Explore document
ginko graph explore ADR-039

# Check health
ginko graph status
```

## Development Workflow

1. **INVENTORY**: Check what exists before building
2. **CONTEXT**: Understand the current sprint and task
3. **THINK**: Consider approach and edge cases
4. **PLAN**: Break down into steps
5. **ACT**: Implement the solution
6. **TEST**: Verify it works
7. **COMPLETE**: Run `ginko task complete <id>`

## Session Management

- Run `ginko start` at session beginning
- Run `ginko handoff` before ending session
- Run `ginko sync` if context is stale

---
*See CLAUDE.md for Claude-specific optimizations*
