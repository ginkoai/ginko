# Migration Log: EPIC-015 Status Migration

**Date:** 2026-01-20
**Epic:** EPIC-015 Graph-Authoritative Operational State
**Sprint:** e015_s03 Migration & Cleanup
**Executed By:** Chris Norton (chris@watchhill.ai)

---

## Pre-Migration State

- **Status tracking:** Dual-write (markdown checkboxes + graph)
- **Active sprint detection:** CURRENT-SPRINT.md file
- **Sync behavior:** Updated both content and status in files
- **Known issues:** Status drift between files and graph

## Migration Executed

### Status Migration (t02)
```
$ ginko migrate status --detail

Status Migration: Markdown -> Graph

Found 35 tasks in sprint files.
Checking current graph status...

Results:
  Updated:    17
  No change:  18
  Errors:     0
  Total:      35

✓ Migration complete
```

### Files Changed

| File | Change |
|------|--------|
| `packages/cli/src/commands/migrate/` | NEW: Migration command |
| `packages/cli/src/commands/sync/sprint-syncer.ts` | Content-only sync |
| `packages/cli/src/commands/sync/sync-command.ts` | Removed CURRENT-SPRINT.md |
| `packages/cli/src/lib/sprint-loader.ts` | Deprecated CURRENT-SPRINT.md |
| `packages/cli/src/lib/context-loader-events.ts` | Skip CURRENT-SPRINT.md |
| `packages/cli/src/templates/epic-template.md` | Removed status fields |
| `packages/cli/src/types/config.ts` | Removed currentSprint path |
| `packages/cli/src/utils/synthesis.ts` | Skip CURRENT-SPRINT.md |
| `CLAUDE.md` | Updated to graph-authoritative workflow |
| `docs/sprints/CURRENT-SPRINT.md` | DELETED |

## Post-Migration State

- **Status tracking:** Graph-only (authoritative)
- **Active sprint detection:** Graph API `/api/v1/sprint/active`
- **Sync behavior:** Content-only (titles, descriptions)
- **CLI commands:** `ginko task complete/start/block` for status

## New Workflow

```bash
# Status management (graph-authoritative)
ginko task start e015_s03_t01      # Start working
ginko task complete e015_s03_t01   # Mark complete
ginko task block e015_s03_t01 "reason"  # Block with reason

# View status
ginko start                        # Shows sprint from graph
ginko task show e015_s03_t01       # Shows task status

# Content sync (no status)
ginko sync                         # Syncs content only
```

## Verification

- [x] `ginko start` shows status from graph
- [x] `ginko task show` displays correct status
- [x] `ginko sync --dry-run` shows content-only sync
- [x] `ginko migrate status --dry-run` works
- [x] TypeScript compilation passes
- [x] No CURRENT-SPRINT.md references remain in active code

## Rollback Plan (if needed)

1. Restore deleted CURRENT-SPRINT.md from git history
2. Revert sprint-syncer.ts to restore status functions
3. Re-enable CURRENT-SPRINT.md checks in sprint-loader.ts

**Note:** Rollback not expected - this is a one-way migration per ADR-060.

---

## References

- ADR-060: Content/State Separation
- EPIC-015: Graph-Authoritative Operational State
- Sprint file: `docs/sprints/SPRINT-2026-02-e015-s03-migration-cleanup.md`
