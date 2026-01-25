---
name: ginko
description: Ginko CLI mastery - session management, task status, graph queries, sprint workflows. Use when working with ginko commands, managing tasks, querying the knowledge graph, or coordinating development sessions.
---

# Ginko CLI Skill

Execute ginko commands effectively for session management, task tracking, and knowledge graph operations.

## Quick Reference

| Need | Command |
|------|---------|
| Start session | `ginko start` |
| End session | `ginko handoff [message]` |
| Check progress | `ginko sprint status show <sprintId>` |
| Mark task done | `ginko task complete <taskId>` |
| Mark sprint done | `ginko sprint complete <sprintId>` |
| Search knowledge | `ginko graph query "topic"` |
| View relationships | `ginko graph explore <nodeId>` |
| Sync from dashboard | `ginko sync` |
| Assign work | `ginko assign <taskId> <email>` |

## Session Lifecycle

### Starting Work
```bash
GINKO_FORCE_TTY=1 ginko start
```
- Shows flow state, work mode, active sprint
- Displays "Next up" task based on assignment and status
- Warns about uncommitted files or stale team context

**On staleness warning**: Auto-run `ginko sync` to pull team updates.

### Ending Work
```bash
ginko handoff "summary of what was done"
```
- Archives session context
- Creates handoff document for continuity

## Task & Sprint Status Management

### Task Status Flow
```
not_started → in_progress → complete
                ↓
              blocked (with reason)
```

### Critical: Marking Work Complete

**Tasks**: Update the knowledge graph (syncs to dashboard)
```bash
ginko task complete e016_s01_t01
ginko task start e016_s01_t02
ginko task block e016_s01_t03 "waiting for API review"
```

**Sprints**: Use sprint command, not task command
```bash
ginko sprint complete e016_s01
ginko sprint start e016_s02
ginko sprint pause e016_s01
```

**Verify status**:
```bash
ginko task show <taskId>      # Shows: ✓ complete, ○ not_started, etc.
ginko sprint status show <sprintId>
```

### Common Pitfall
If dashboard shows tasks as "todo" but `ginko graph explore` shows checkmarks:
- The graph node has markdown checkmarks but status property wasn't updated
- Fix: Run `ginko task complete <taskId>` for each task
- This updates the graph property that syncs to dashboard

### Cascade Completion
When finishing the last task in a sprint:
```bash
ginko task complete e016_s01_t07 --cascade
```
Auto-completes parent sprint if all tasks done.

## Knowledge Graph Queries

### Semantic Search
```bash
ginko graph query "authentication patterns"
ginko graph query "error handling" --limit 10
ginko graph query "topic" --type ADR
```

### Explore Relationships
```bash
ginko graph explore e016_s01        # Sprint and its tasks
ginko graph explore ADR-039         # ADR and connections
ginko graph explore e016_s01_t01    # Task details
```

### Graph Health
```bash
ginko graph status    # Node counts, relationships
ginko graph health    # API reliability metrics
```

## Assignment & Team

### Assign Tasks
```bash
ginko assign e016_s03_t01 user@example.com
ginko assign --sprint e016_s03 --all user@example.com
```

### Sync Changes
```bash
ginko sync              # Pull all dashboard changes
ginko sync --type ADR   # Sync only ADRs
ginko sync --preview    # Preview without syncing
```

## Sprint Planning

### View Roadmap
```bash
ginko roadmap    # Now/Next/Later priority lanes
```

### Sprint Commands
```bash
ginko sprint deps              # Visualize task dependencies
ginko sprint start <id>        # Activate sprint
ginko sprint complete <id>     # Mark sprint done
ginko sprint pause <id>        # Temporarily hold
```

## Entity Naming Convention

| Entity | Format | Example |
|--------|--------|---------|
| Epic | `e{NNN}` | `e016` |
| Sprint | `e{NNN}_s{NN}` | `e016_s03` |
| Task | `e{NNN}_s{NN}_t{NN}` | `e016_s03_t01` |
| Ad-hoc | `adhoc_{YYMMDD}_s{NN}` | `adhoc_260123_s01` |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GINKO_FORCE_TTY=1` | Force rich output (tables, colors) in Claude Code |
| `FORCE_COLOR=1` | Force chalk colors (auto-set with GINKO_FORCE_TTY) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Task not found | Check ID format matches `e{NNN}_s{NN}_t{NN}` |
| Sprint won't complete | Use `ginko sprint complete`, not `ginko task complete` |
| Dashboard out of sync | Run `ginko task complete` for each task (updates graph property) |
| Stale team context | Run `ginko sync` to pull updates |
| Graph query fails | Check `ginko graph health` for API issues |

## Common Workflows

### Daily Session
1. `ginko start` - Load context, see next task
2. `ginko task start <id>` - Mark task in progress
3. Do the work
4. `ginko task complete <id>` - Mark done
5. `ginko handoff "summary"` - End session

### Sprint Completion
1. Verify all tasks: `ginko graph explore <sprintId>`
2. Complete any unmarked tasks: `ginko task complete <taskId>`
3. Complete sprint: `ginko sprint complete <sprintId>`
4. Verify: `ginko sprint status show <sprintId>`

### Investigate Status Mismatch
1. Check graph: `ginko graph explore <id>`
2. Check status: `ginko task show <id>` or `ginko sprint status show <id>`
3. If mismatch: update with appropriate command
4. Verify dashboard reflects changes
