/**
 * @fileType: documentation
 * @status: current
 * @updated: 2025-12-15
 * @tags: knowledge-graph, dashboard, sync, editing, beta
 * @related: ADR-002-ai-readable-code-frontmatter.md, ginko-sync-command.md
 * @priority: high
 * @complexity: medium
 * @dependencies: ginko-cli, dashboard-app, graph-api
 */

# Knowledge Editing Guide

**Status:** Beta
**Last Updated:** 2025-12-15
**Estimated Read Time:** 5 minutes

## Introduction

Ginko provides a live dashboard for editing knowledge nodes (ADRs, Patterns, Tasks, Gotchas) with seamless synchronization to your git repository. This guide covers creating and editing nodes in the dashboard and syncing changes back to your local codebase.

**Key Concepts:**
- **Dashboard** - Live cloud-based editor for quick updates
- **Git Repository** - Source of truth for all knowledge
- **Sync** - Bidirectional synchronization between dashboard and git

---

## The Sync Workflow

### How It Works

```
┌─────────────┐         ginko sync        ┌─────────────┐
│  Dashboard  │◄──────────────────────────►│     Git     │
│   (Cloud)   │                            │  (Local)    │
└─────────────┘                            └─────────────┘
     ▲                                            ▲
     │                                            │
  Live editor                              Source of truth
  Quick changes                             Version controlled
```

**The Flow:**

1. **Dashboard is the live editor** - Edit nodes in real-time through the web interface
2. **Git repository is source of truth** - All knowledge ultimately lives in version-controlled files
3. **Changes marked "Pending Sync"** - Dashboard tracks unsynced modifications
4. **Run `ginko sync`** - Pull changes from cloud to local git repository

**Why This Approach:**
- Edit anywhere via dashboard (mobile, tablet, desktop)
- Maintain git history and version control
- Review changes before committing
- Collaborate with team through familiar git workflow

---

## Creating Nodes

### Step-by-Step

**1. Navigate to Graph Page**

Open the dashboard and click "Graph" in the main navigation.

![Graph Navigation](../assets/screenshots/graph-navigation.png)

**2. Click "New" Button**

Use the global "New" button or type-specific create actions:
- "New Task" button in Tasks view
- "New ADR" button in ADRs view
- "New Pattern" button in Patterns view
- "New Gotcha" button in Gotchas view

![Create Node Button](../assets/screenshots/create-node-button.png)

**3. Fill Form Based on Node Type**

Each node type has specific required fields (see Node Types & Fields section).

![Node Creation Form](../assets/screenshots/node-creation-form.png)

**4. Save**

Click "Save" to create the node in the cloud graph. The node is now live in the dashboard but **not yet in git**.

![Pending Sync Badge](../assets/screenshots/pending-sync-badge.png)

---

## Node Types & Fields

### Task

**Required Fields:**
- `task_id` - Hierarchical ID (e.g., `e005_s01_t01`)
- `title` - Brief description (50 chars max)
- `description` - Detailed task description (markdown)
- `status` - todo, in-progress, completed, paused
- `priority` - critical, high, medium, low

**Optional Fields:**
- `assignee` - User email
- `sprint_id` - Parent sprint reference
- `tags` - Searchable keywords
- `estimated_hours` - Effort estimate
- `actual_hours` - Time spent

**Example:**
```json
{
  "task_id": "e005_s01_t01",
  "title": "Implement event-based context loading",
  "description": "Replace file-based loading with event stream...",
  "status": "completed",
  "priority": "high",
  "assignee": "chris@watchhill.ai",
  "sprint_id": "e005_s01"
}
```

---

### ADR (Architecture Decision Record)

**Required Fields:**
- `adr_id` - Sequential ID (e.g., `ADR-043`)
- `title` - Decision name (60 chars max)
- `decision` - What was decided (markdown)
- `consequences` - Impact and trade-offs (markdown)
- `status` - proposed, accepted, superseded, deprecated

**Optional Fields:**
- `context` - Background and motivation
- `alternatives` - Options considered
- `related_adrs` - References to other ADRs
- `superseded_by` - ID of superseding ADR
- `tags` - Searchable keywords

**Example:**
```json
{
  "adr_id": "ADR-043",
  "title": "Event-Based Context Loading",
  "decision": "Migrate from file-based to event stream loading...",
  "consequences": "70% faster startup, reduced file I/O...",
  "status": "accepted",
  "context": "Original file loading took 2-3 seconds...",
  "tags": ["performance", "context", "events"]
}
```

---

### Pattern

**Required Fields:**
- `pattern_id` - Unique identifier (e.g., `retry-pattern`)
- `name` - Pattern name (50 chars max)
- `description` - How to use the pattern (markdown)
- `confidence` - high, medium, low

**Optional Fields:**
- `code_example` - Sample implementation
- `when_to_use` - Applicable scenarios
- `anti_patterns` - What to avoid
- `related_patterns` - Related pattern IDs
- `tags` - Searchable keywords

**Example:**
```json
{
  "pattern_id": "retry-pattern",
  "name": "Exponential Backoff Retry",
  "description": "Retry failed operations with increasing delays...",
  "confidence": "high",
  "code_example": "async function retryWithBackoff(fn) {...}",
  "when_to_use": "Network requests, database connections, API calls",
  "tags": ["resilience", "networking", "errors"]
}
```

---

### Gotcha

**Required Fields:**
- `gotcha_id` - Unique identifier (e.g., `timer-unref-gotcha`)
- `title` - Brief gotcha description (50 chars max)
- `description` - Detailed explanation (markdown)
- `severity` - critical, high, medium, low
- `mitigation` - How to avoid/fix (markdown)

**Optional Fields:**
- `code_example` - Sample of problematic code
- `related_patterns` - Patterns that help avoid this
- `tags` - Searchable keywords

**Example:**
```json
{
  "gotcha_id": "timer-unref-gotcha",
  "title": "setInterval keeps Node.js process alive",
  "description": "Timers without .unref() prevent clean exit...",
  "severity": "high",
  "mitigation": "Call .unref() on timer: timer.unref()",
  "code_example": "// Bad\nsetInterval(fn, 1000)\n// Good\nsetInterval(fn, 1000).unref()",
  "tags": ["nodejs", "timers", "performance"]
}
```

---

## Editing Nodes

### Step-by-Step

**1. Open Node in Detail Panel**

Click any node in the graph view or list view to open the detail panel.

![Node Detail Panel](../assets/screenshots/node-detail-panel.png)

**2. Click "Edit" Button**

The edit button appears in the top-right of the detail panel.

![Edit Button](../assets/screenshots/edit-button.png)

**3. Modify Fields**

Update any editable fields. Required fields cannot be left empty.

![Edit Form](../assets/screenshots/edit-form.png)

**4. Save**

Click "Save" to commit changes to the cloud graph. The node is marked as "Pending Sync" with an indicator badge.

![Unsynced Badge](../assets/screenshots/unsynced-badge.png)

---

## Syncing to Git

### Basic Usage

**Command:**
```bash
ginko sync
```

**What Happens:**
1. Fetches all unsynced nodes from cloud graph
2. Diffs against existing git files
3. Writes updated/new files to local repository
4. Commits changes with standardized message
5. Clears "Pending Sync" status in dashboard

**Example Output:**
```
Fetching unsynced nodes from graph...
Found 3 pending changes:
  - Task e005_s01_t01 (modified)
  - ADR-043 (modified)
  - Pattern retry-pattern (new)

Writing files...
  ✓ docs/sprints/e005_s01/TASK-01.md
  ✓ docs/adr/ADR-043-event-based-context-loading.md
  ✓ docs/patterns/retry-pattern.md

Committing changes...
  ✓ Committed: Sync 3 nodes from dashboard

Sync complete. Dashboard badges cleared.
```

---

### Advanced Options

**Dry Run (Preview Changes):**
```bash
ginko sync --dry-run
```

Shows what would be synced without making changes.

**Force Overwrite:**
```bash
ginko sync --force
```

Overwrites local git changes with dashboard versions (use with caution).

**Sync Specific Types:**
```bash
ginko sync --types=ADR,Task
```

Only sync specific node types.

---

### Sync Process Details

**1. Fetch Unsynced Nodes**

Queries graph API for nodes with `synced: false` flag.

**2. Diff Against Git**

Compares cloud version with local file:
- If file doesn't exist → Create new file
- If file exists and unchanged → Skip
- If file exists and differs → Show diff, prompt for resolution

**3. Write Files**

Maps nodes to file paths based on type:
- Tasks → `docs/sprints/{sprint_id}/TASK-{task_num}.md`
- ADRs → `docs/adr/ADR-{adr_num}-{slug}.md`
- Patterns → `docs/patterns/{pattern_id}.md`
- Gotchas → `docs/gotchas/{gotcha_id}.md`

**4. Commit**

Creates git commit with message:
```
Sync {count} nodes from dashboard

- {node_type} {node_id} ({action})
- {node_type} {node_id} ({action})

🤖 Generated with Ginko
```

**5. Clear Dashboard Badge**

Updates graph API to mark nodes as `synced: true`.

---

## Conflict Resolution

### Detecting Conflicts

Conflicts occur when:
- Dashboard has changes **AND**
- Git has local uncommitted changes **OR**
- Git has been updated since last sync

**Warning Message:**
```
⚠️  Conflict detected: docs/adr/ADR-043-event-based-context-loading.md

Dashboard version (modified 2025-12-15 10:30):
  Title: Event-Based Context Loading
  Status: accepted

Git version (modified 2025-12-15 11:00):
  Title: Event-Based Context Loading
  Status: accepted
  Consequences: [Updated locally]

Choose action:
  [D] Accept dashboard version
  [G] Keep git version (discard dashboard changes)
  [M] Manual merge (open in editor)
  [S] Skip this file
```

---

### Resolution Strategies

**Accept Dashboard Version [D]:**
- Overwrites local git file with dashboard version
- Discards uncommitted git changes
- Use when dashboard is most current

**Keep Git Version [G]:**
- Keeps local git file unchanged
- Marks node as synced in dashboard (prevents re-sync)
- Use when git has critical local changes

**Manual Merge [M]:**
- Opens both versions in configured merge tool
- Allows manual conflict resolution
- Commits merged result
- Use when both versions have valuable changes

**Skip [S]:**
- Leaves both versions unchanged
- Node remains "Pending Sync" in dashboard
- Use when conflict needs investigation

---

### Best Practices for Avoiding Conflicts

1. **Sync frequently** - Run `ginko sync` daily to minimize divergence
2. **Commit git changes first** - Ensure clean working directory before syncing
3. **Use dashboard for quick edits** - Avoid editing synced files directly in git
4. **Coordinate with team** - Agree on edit locations (dashboard vs. git)

---

## Best Practices

### Daily Workflow

**Morning:**
```bash
# Start with clean slate
git pull
ginko sync
```

**During Work:**
- Edit nodes in dashboard for quick updates
- Create new nodes via dashboard forms
- Check "Pending Sync" badge periodically

**Evening:**
```bash
# Sync changes to git
ginko sync

# Review and commit
git status
git diff docs/
git commit -m "Your additional changes"
git push
```

---

### Use Dashboard For

✅ **Quick Edits:**
- Fixing typos in ADR titles
- Updating task status
- Adding tags to patterns

✅ **Mobile Access:**
- Reviewing knowledge on mobile
- Quick status updates from phone

✅ **Visual Exploration:**
- Browsing graph relationships
- Discovering related nodes

---

### Use CLI/Git For

✅ **Batch Operations:**
- Creating multiple related files
- Refactoring file structures
- Bulk updates via scripts

✅ **Complex Markdown:**
- Multi-section documents
- Code-heavy patterns
- Detailed ADR consequences

✅ **Version Control:**
- Reviewing history
- Reverting changes
- Branch-based workflows

---

## Troubleshooting

### Sync Fails with "Unauthorized"

**Cause:** Missing or expired authentication token.

**Solution:**
```bash
ginko login
ginko graph init  # If graph ID missing
```

---

### Dashboard Shows Old Data

**Cause:** Browser cache or stale graph query.

**Solution:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Run `ginko graph refresh` to rebuild graph
3. Check graph sync status in dashboard settings

---

### Files Not Created After Sync

**Cause:** Path resolution or file permissions issue.

**Solution:**
```bash
# Check current directory
pwd  # Should be project root

# Verify directories exist
ls -la docs/adr docs/sprints docs/patterns

# Run sync with verbose logging
ginko sync --verbose
```

---

### Duplicate Nodes After Sync

**Cause:** Node ID mismatch between dashboard and git.

**Solution:**
```bash
# Find duplicates
ginko graph verify --check-duplicates

# Resolve manually
ginko sync --interactive
```

---

## Related Documentation

- [ADR-002: AI-Optimized File Discovery](../adr/ADR-002-ai-readable-code-frontmatter.md)
- [Graph API Reference](../api/GRAPH-API.md)
- [Ginko CLI Commands](../cli/COMMANDS.md)
- [Entity Naming Convention (ADR-052)](../adr/ADR-052-entity-naming-convention.md)

---

## Feedback & Support

This is a **beta feature**. Report issues or suggest improvements:

- GitHub Issues: [ginko/issues](https://github.com/ginko/ginko/issues)
- Email: support@ginkoai.com
- Community: [ginko.community](https://ginko.community)

---

**Last Updated:** 2025-12-15
**Version:** 1.0-beta
**Contributors:** Chris Norton (chris@watchhill.ai)
