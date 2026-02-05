# Bug Report - 2026-02-05

## Session Context
- **Reporter:** Chris Norton / Claude Opus 4.5
- **Project:** Ginko Core
- **Graph ID:** gin_1762125961056_dg4bsd
- **CLI Version:** 2.4.5

---

## BUG-026: Epic push succeeds but node not created [HIGH]

**Status:** Open
**Severity:** HIGH
**Component:** Dashboard API / Document Sync

### Description
When pushing EPIC-018 to the graph, the CLI reports success but the node is not created in the graph.

### Steps to Reproduce
1. Create epic file: `docs/epics/EPIC-018-flow-state-optimization.md`
2. Commit the file
3. Run `ginko push --all`
4. CLI reports "578 document(s) pushed" including 19 epics
5. Run `ginko graph explore e018`
6. Result: "Node e018 not found in graph"

### Evidence
```
# Push succeeds
✓ 578 document(s) pushed
✓ Tasks synced: 0 created, 510 updated

# But node doesn't exist
ginko graph explore e018
✗ Error: Node "e018" not found in graph
```

### Expected Behavior
Epic node `e018` should exist in graph after successful push.

### Actual Behavior
Push reports success, sync-state records file as pushed, but node doesn't exist.

### Impact
- New epics silently fail to sync
- Users believe content is in graph when it isn't
- Breaks graph queries and exploration

### Root Cause Candidates
1. Document processing API silently failing on epic creation
2. ID collision/deduplication triggering edge case
3. Embedding generation failure skipping node creation

### Related
- Secondary bug: `ginko push epic EPIC-018 --all` doesn't work - `--all` flag not inherited by subcommands (`packages/cli/src/commands/push/index.ts:69-77`)

---

## BUG-027: CRITICAL - Graph node duplication on push [CRITICAL]

**Status:** Open
**Severity:** CRITICAL
**Component:** Dashboard API / Document Sync
**Recurring:** Yes (previously fixed in BUG-025, a151b85)

### Description
Running `ginko push --all` creates duplicate nodes in the graph. This is a recurring issue that was supposedly fixed but has resurfaced.

### Evidence from Dashboard (2026-02-05)
| Entity Type | Local Files | Graph Nodes | Duplication |
|-------------|-------------|-------------|-------------|
| Epics | 19 | 26 | 37% extra |
| ADRs | 93 | 171 | 84% extra |
| Sprints | 111 | 222 | 100% extra |
| Patterns | 41 | 96 | 134% extra |
| Gotchas | 26 | 76 | 192% extra |

### Steps to Reproduce
1. Run `ginko push --all`
2. Check dashboard Knowledge Graph stats
3. Compare node counts to local file counts

### Expected Behavior
Each local file should create exactly ONE node in the graph.

### Actual Behavior
Files create multiple nodes, roughly doubling the count.

### Impact
- **Data integrity:** Graph contains duplicate/conflicting data
- **Search quality:** Semantic search returns duplicates
- **Performance:** Wasted storage and embedding computation
- **User trust:** Fundamental data integrity violation

### Previous Fixes (Now Failing)
- BUG-025: Duplicate entities during epic creation (commit a151b85)
- BUG-007: Duplicate Sprint/Epic nodes (PR #7, commit 4584641)

### Root Cause Investigation Needed
1. Is the deduplication logic in document sync API failing?
2. Are multiple ID formats creating separate nodes? (e.g., `e018` vs `EPIC-018`)
3. Is there a race condition in batch uploads?
4. Are relationships being created that spawn phantom nodes?

### Immediate Actions Required
1. **Audit:** Identify all duplicate nodes and their ID patterns
2. **Fix:** Implement proper upsert logic with stable entity IDs
3. **Cleanup:** Remove duplicate nodes from production graph
4. **Test:** Add integration tests for idempotent push

---

## Priority
1. BUG-027 (CRITICAL) - Must fix immediately, data integrity at stake
2. BUG-026 (HIGH) - Blocking new epic creation

## Related ADRs
- ADR-052: Entity Naming Convention
- ADR-077: Git-Integrated Push/Pull Sync
