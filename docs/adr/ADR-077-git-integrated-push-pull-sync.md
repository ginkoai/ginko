# ADR-077: Git-Integrated Push/Pull Sync Architecture

## Status
Accepted

## Date
2026-01-28

## Context

The current ginko CLI has inconsistent terminology around syncing data between local files and the knowledge graph:

| Current Command | Direction | Confusion |
|-----------------|-----------|-----------|
| `ginko sync` | Graph → Local | "Sync" implies bidirectional |
| `ginko epic --sync` | Local → Graph | Same word, opposite direction |
| `ginko charter --sync` | Local → Graph | Same word, opposite direction |
| `ginko migrate status` | Local → Graph | Different verb entirely |

This creates cognitive load for both human and AI collaborators. The mental model is unclear:
- What does "sync" mean?
- Which direction does data flow?
- How do conflicts get resolved?

Additionally, we maintain custom change tracking when git already provides robust change detection.

## Decision

Adopt a **git-inspired push/pull model** with git-integrated change detection.

### Core Principles

1. **Push = Local → Graph** (upload your changes)
2. **Pull = Graph → Local** (download team changes)
3. **Git tracks changes** (no custom change detection)
4. **Workflow events auto-push** (near real-time state sync)

### Command Structure

#### Sync Commands (Verb-First)

```bash
# Push local changes to graph
ginko push                        # push all changes since last push
ginko push epic                   # push all changed epics
ginko push epic EPIC-001          # push specific epic
ginko push sprint e001_s01        # push specific sprint
ginko push charter                # push charter
ginko push --dry-run              # preview what would be pushed
ginko push --force                # overwrite graph even if conflicts

# Pull graph changes to local
ginko pull                        # pull all changes
ginko pull epic                   # pull all epics
ginko pull sprint e001_s01        # pull specific sprint
ginko pull --force                # overwrite local with graph version

# Status and diff
ginko status                      # show sync state (unpushed/unpulled)
ginko diff epic/EPIC-001          # show local vs graph differences
```

#### Entity Commands (Noun-First, for CRUD)

```bash
ginko epic list                   # list epics
ginko epic create                 # create new epic
ginko epic show EPIC-001          # view details
ginko sprint complete e001_s01    # complete sprint (auto-pushes state)
ginko task complete e001_s01_t01  # complete task (auto-pushes state)
```

### Git-Integrated Change Detection

Instead of maintaining custom tracking, leverage git:

```bash
# Detect changes since last push
git diff --name-only <last-push-commit>..HEAD
```

**File type detection by path:**
```
docs/epics/EPIC-*.md        → Epic
docs/sprints/SPRINT-*.md    → Sprint
docs/PROJECT-CHARTER.md     → Charter
docs/adr/ADR-*.md           → ADR
```

**Minimal tracking state:**
```json
// .ginko/sync-state.json
{
  "lastPushCommit": "abc123def",
  "lastPullTimestamp": "2026-01-28T23:45:00Z"
}
```

### Natural Push Points (Auto-Sync)

Workflow completions trigger automatic state pushes for near real-time graph updates:

| Event | Auto-Push Action |
|-------|------------------|
| `ginko task complete <id>` | Push task state |
| `ginko task start <id>` | Push task state |
| `ginko task block <id>` | Push task state |
| `ginko sprint complete <id>` | Push sprint state + all task states |
| `ginko epic complete <id>` | Push epic state |
| `ginko handoff` | Push all uncommitted changes + events |

### Optional Git Hook

For teams wanting automatic content sync on commit:

```bash
ginko hooks install    # installs post-commit hook
ginko hooks remove     # removes hook
```

Hook implementation:
```bash
#!/bin/bash
# .git/hooks/post-commit
ginko push --from-commit HEAD --silent
```

### Status Command Output

```bash
$ ginko status

On project: my-project
Graph: connected (last sync: 5 min ago)

Changes not pushed (local → graph):
  modified:   epic/EPIC-001 (content changed)
  modified:   sprint/e001_s01 (2 tasks completed)
  new file:   sprint/e001_s03 (not in graph)

Changes not pulled (graph → local):
  task/e001_s01_t02: blocked by @teammate

Run 'ginko push' to upload local changes
Run 'ginko pull' to download team changes
```

### Diff Command Output

```bash
$ ginko diff epic/EPIC-001

--- graph
+++ local
@@ status @@
- active
+ complete

@@ success_criteria @@
  - [x] API endpoints implemented
  - [x] Dashboard integration
+ - [x] Documentation complete (new)
```

### Content vs State (ADR-060 Alignment)

This architecture aligns with ADR-060's principle:

| Data Type | Authoritative Source | Sync Direction |
|-----------|---------------------|----------------|
| **Content** (title, description, criteria) | Local (markdown) | Push to graph |
| **State** (status, assignee, blocked) | Graph | Pull to local |

Conflict resolution:
- Content conflicts: Local wins (your edits preserved)
- State conflicts: Graph wins (team state is authoritative)

## Migration Path

### Phase 1: Add New Commands (Non-Breaking)
- Add `ginko push`, `ginko pull`, `ginko status`, `ginko diff`
- Keep existing `ginko sync` and `--sync` flags working
- Add deprecation warnings

### Phase 2: Update Documentation
- Update CLAUDE.md templates
- Update help text
- Blog post explaining the change

### Phase 3: Deprecate Old Commands
- `ginko sync` → warning suggesting `ginko pull`
- `ginko epic --sync` → warning suggesting `ginko push epic`
- `ginko charter --sync` → warning suggesting `ginko push charter`

### Phase 4: Remove (Major Version)
- Remove deprecated commands in next major version

## Consequences

### Positive
- **Clear mental model**: Push/pull is universally understood
- **Git integration**: Leverages existing change tracking
- **Near real-time sync**: Workflow events auto-push state
- **Familiar UX**: Developers already know git patterns
- **Reduced code**: No custom change detection logic

### Negative
- **Migration effort**: Need to update existing commands
- **Learning curve**: Users must learn new commands (mitigated by familiarity)
- **Git dependency**: Assumes project uses git (already a requirement)

### Neutral
- **More commands**: But each has clear, single purpose
- **Hook optional**: Teams choose their sync frequency

## Alternatives Considered

### 1. Bidirectional Sync
`ginko sync` does smart merge in both directions.

Rejected: Complex conflict resolution, unclear what happens.

### 2. Keep Current Structure
Just improve documentation.

Rejected: Fundamental terminology problem can't be documented away.

### 3. REST-Style Commands
`ginko graph post epic`, `ginko graph get sprint`

Rejected: Too verbose, not familiar to most developers.

## Implementation Notes

### Push Implementation

```typescript
async function push(options: PushOptions): Promise<void> {
  const lastPushCommit = await getLastPushCommit();

  // Get changed files from git
  const changedFiles = await getChangedFilesSince(lastPushCommit);

  // Filter by entity type if specified
  const filesToPush = options.entityType
    ? changedFiles.filter(f => matchesEntityType(f, options.entityType))
    : changedFiles;

  if (options.dryRun) {
    console.log('Would push:', filesToPush);
    return;
  }

  // Push each file to graph
  for (const file of filesToPush) {
    await pushFileToGraph(file);
  }

  // Update tracking
  await setLastPushCommit(await getCurrentCommit());
}
```

### Auto-Push on Workflow Events

```typescript
// In task complete handler
async function completeTask(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, 'complete');

  // Auto-push state to graph
  await pushTaskState(taskId);

  console.log(`✓ Task ${taskId} marked complete`);
}
```

## References

- ADR-060: Content from Git, State from Graph
- ADR-054: Dashboard Knowledge Sync
- Git documentation: https://git-scm.com/docs

## Participants

- Chris Norton
- Claude (AI Collaborator)
