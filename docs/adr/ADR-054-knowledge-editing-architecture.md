---
type: decision
status: accepted
updated: 2025-12-31
tags: [knowledge-graph, editing, crud, sync, dashboard, git-integration]
related: [ADR-041-graph-migration-write-dispatch.md, ADR-042-ai-assisted-knowledge-graph-quality.md, ADR-039-graph-based-context-discovery.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 12-min
dependencies: [ADR-041, ADR-042]
---

# ADR-054: Knowledge Editing Architecture

## Status

**Accepted** | 2025-12-31 (Sprint sync added)

**Authors:** Chris Norton, Claude (AI)
**Sprint:** EPIC-005 Sprint 4 - Market Readiness

## Context

### Business Context

Ginko's knowledge graph stores critical project artifacts: ADRs, PRDs, Patterns, Gotchas, and Charter documents. Currently, these documents are:
- **Created** via CLI during development sessions (`ginko log`, `ginko knowledge sync`)
- **Stored** in Neo4j cloud graph with git as source of truth
- **Read-only** in the dashboard (visualization only)

For beta launch, users need the ability to **create and edit knowledge nodes directly in the dashboard**, with changes syncing back to their git repository.

### Technical Context

**Current Architecture:**
- CloudGraphClient supports CREATE, READ, DELETE (no UPDATE/PATCH)
- `ginko knowledge sync` pushes local files → cloud graph
- No reverse sync: cloud graph → git files
- No edit tracking (who changed what, when)
- No conflict detection for concurrent edits

**Key Constraint:** Git remains the source of truth. Dashboard edits must eventually land in git.

### Requirements

1. **Edit any knowledge node** in the dashboard (ADR, PRD, Pattern, Gotcha, Charter)
2. **Track sync status** - know which nodes have unsynced changes
3. **Pull changes to git** via CLI command
4. **Handle conflicts** when both dashboard and local files change
5. **Maintain audit trail** - who edited, when, what changed

## Decision

We will implement a **bidirectional sync architecture** with:
1. **Dashboard as editing surface** - create/edit nodes in web UI
2. **Graph as staging area** - changes stored with `synced: false` flag
3. **CLI as sync engine** - `ginko sync` pulls changes to git
4. **Git as source of truth** - final authority for content

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     BIDIRECTIONAL SYNC FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  Dashboard   │────▶│    Graph     │────▶│     Git      │    │
│  │  (Edit UI)   │     │  (Staging)   │     │   (Truth)    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │             │
│         │   POST /nodes      │   ginko sync       │             │
│         │   PUT /nodes/:id   │   (pull changes)   │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  synced:     │     │  synced:     │     │  Commit +    │    │
│  │  false       │     │  true        │     │  Push        │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. Conflict Resolution Strategy: **Git Wins with Manual Override**

| Scenario | Resolution |
|----------|------------|
| Only dashboard changed | Apply dashboard → git |
| Only git changed | Dashboard out of sync, warn user |
| Both changed (conflict) | Show diff, user chooses, or merge |
| Force mode (`--force`) | Dashboard overwrites git (use carefully) |

**Rationale:** Git is the authoritative source. Developers expect git to be canonical. Dashboard edits are convenience, not authority.

#### 2. Editable Node Types

| Type | Editable | Validation | File Pattern |
|------|----------|------------|--------------|
| ADR | Yes | Frontmatter + sections required | `docs/adr/ADR-XXX-*.md` |
| PRD | Yes | Frontmatter required | `docs/prd/PRD-XXX-*.md` |
| Pattern | Yes | Name, description required | `docs/patterns/PATTERN-*.md` |
| Gotcha | Yes | Name, severity required | `docs/gotchas/GOTCHA-*.md` |
| Charter | Yes | Single file per project | `docs/PROJECT-CHARTER.md` |
| Sprint | Yes | Status, progress tracked | `docs/sprints/SPRINT-*.md` |
| Task | Yes (status only) | Status changes only | Embedded in Sprint file |
| Event | No | Immutable after creation | N/A (JSONL) |
| Session | No | System-generated | N/A |

#### 3. Sync Tracking Schema

```typescript
interface NodeSyncStatus {
  nodeId: string;
  nodeType: 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Charter' | 'Sprint';

  // Sync state
  synced: boolean;
  syncedAt: Date | null;

  // Edit tracking
  editedAt: Date;
  editedBy: string;  // user email

  // Version tracking
  contentHash: string;  // SHA-256 of content
  gitHash: string | null;  // Hash when last synced from git

  // For conflict detection
  lastKnownGitHash: string | null;
}
```

#### 4. API Design

**New Endpoints:**

```typescript
// Update existing node (partial update)
PATCH /api/v1/graph/nodes/:id
Body: { title?: string, content?: string, status?: string, ... }
Response: { node: Node, syncStatus: NodeSyncStatus }

// Get nodes pending sync
GET /api/v1/graph/nodes/unsynced?graphId={id}
Response: { nodes: NodeWithSyncStatus[], count: number }

// Mark node as synced (called by CLI after git commit)
POST /api/v1/graph/nodes/:id/sync
Body: { gitHash: string, syncedAt: Date }
Response: { success: boolean }

// Get sync status for a node
GET /api/v1/graph/nodes/:id/sync-status
Response: NodeSyncStatus

// Create new node (with sync tracking)
POST /api/v1/graph/nodes
Body: { type: string, title: string, content: string, ... }
Response: { node: Node, syncStatus: { synced: false, ... } }
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DASHBOARD                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  NodeEditor     │  │  SyncBanner     │  │  ConflictModal  │ │
│  │  - Markdown     │  │  - Unsynced     │  │  - Diff view    │ │
│  │  - Form fields  │  │    count badge  │  │  - Resolution   │ │
│  │  - Validation   │  │  - Sync prompt  │  │    options      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Graph API Layer                         │  │
│  │  POST /nodes  |  PATCH /nodes/:id  |  GET /nodes/unsynced │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEO4J GRAPH                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Node Properties (Extended)                              │   │
│  │  - id, title, content, status, tags (existing)          │   │
│  │  + synced: boolean                                       │   │
│  │  + syncedAt: datetime                                    │   │
│  │  + editedAt: datetime                                    │   │
│  │  + editedBy: string                                      │   │
│  │  + contentHash: string                                   │   │
│  │  + gitHash: string (nullable)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLI                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  ginko sync     │  │  ginko start    │  │  Sync Engine    │ │
│  │  --dry-run      │  │  (warn if       │  │  - Diff logic   │ │
│  │  --force        │  │   unsynced)     │  │  - File writer  │ │
│  │  --type=ADR     │  │                 │  │  - Git commit   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GIT REPOSITORY                             │
├─────────────────────────────────────────────────────────────────┤
│  docs/adr/ADR-*.md  |  docs/prd/PRD-*.md  |  docs/patterns/*.md │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model Changes

**New Node Properties:**

```cypher
// Add sync tracking to all knowledge nodes
MATCH (n:ADR|PRD|Pattern|Gotcha|Charter|Sprint)
SET n.synced = true,
    n.syncedAt = datetime(),
    n.editedAt = n.updatedAt,
    n.editedBy = 'system',
    n.contentHash = '',
    n.gitHash = ''
```

### CLI Sync Command Flow

```typescript
// ginko sync command flow
async function syncCommand(options: SyncOptions): Promise<void> {
  // 1. Fetch unsynced nodes
  const unsynced = await api.getUnsyncedNodes(graphId);

  if (unsynced.length === 0) {
    console.log('All nodes are synced.');
    return;
  }

  console.log(`Found ${unsynced.length} unsynced nodes.`);

  // 2. For each node
  for (const node of unsynced) {
    // 2a. Get local file path
    const filePath = getFilePath(node.type, node.id);

    // 2b. Check if file exists
    const localExists = await fileExists(filePath);
    const localContent = localExists ? await readFile(filePath) : null;
    const localHash = localContent ? hash(localContent) : null;

    // 2c. Detect conflicts
    if (localHash && localHash !== node.gitHash) {
      // Local file changed since last sync
      if (options.force) {
        // Force: overwrite local with graph version
        await writeFile(filePath, node.content);
      } else {
        // Show conflict, ask user
        const resolution = await showConflictDialog(node, localContent);
        if (resolution === 'skip') continue;
        if (resolution === 'use-graph') await writeFile(filePath, node.content);
        if (resolution === 'use-local') await api.updateNode(node.id, { content: localContent });
      }
    } else {
      // No conflict: write graph version to local
      await writeFile(filePath, node.content);
    }

    // 2d. Mark as synced in graph
    const newHash = hash(await readFile(filePath));
    await api.markSynced(node.id, newHash);
  }

  // 3. Git commit
  if (!options.dryRun) {
    await gitAdd(syncedFiles);
    await gitCommit('Sync: Pull knowledge node edits from dashboard');
  }
}
```

## Alternatives Considered

### Alternative 1: Real-time Git Commits from Dashboard

**Approach:** Dashboard writes directly to git (via GitHub API or similar).

| Aspect | Analysis |
|--------|----------|
| Pros | Immediate sync, no CLI step required |
| Cons | Complex auth (GitHub OAuth), rate limits, offline impossible |
| Decision | **Rejected** - adds significant complexity, breaks offline workflow |

### Alternative 2: Webhook-based Sync

**Approach:** Dashboard notifies CLI via webhook when edits occur.

| Aspect | Analysis |
|--------|----------|
| Pros | Near-real-time sync |
| Cons | Requires CLI to be running, network exposure, firewall issues |
| Decision | **Rejected** - CLI is not a persistent service |

### Alternative 3: Graph as Source of Truth

**Approach:** Flip the architecture: graph is canonical, git is backup.

| Aspect | Analysis |
|--------|----------|
| Pros | Simpler sync (always push from graph) |
| Cons | Breaks developer mental model, git history fragmented |
| Decision | **Rejected** - git as truth is core to developer workflow |

## Consequences

### Positive

- **Dashboard becomes productive** - users can create/edit knowledge without CLI
- **Git remains canonical** - aligns with developer expectations
- **Explicit sync** - users control when changes land in git
- **Conflict visibility** - users aware of divergent changes
- **Audit trail** - editedBy/editedAt tracked for accountability

### Negative

- **Extra step** - users must run `ginko sync` to finalize edits
- **Potential confusion** - "where is my edit?" if sync not run
- **Notification overhead** - need to alert users about unsynced nodes

### Neutral

- **Learning curve** - new workflow for dashboard editing
- **Two sources** - during editing, content exists in both graph and (eventually) git

## Implementation Details

### Phase 1: API Extensions (TASK-3)

1. Add PATCH endpoint for node updates
2. Add GET /nodes/unsynced endpoint
3. Add POST /nodes/:id/sync endpoint
4. Extend CloudGraphClient with edit tracking

### Phase 2: Dashboard Editor (TASK-2)

1. NodeEditor component with markdown + form fields
2. NodeEditorForm for structured fields per type
3. MarkdownEditor with live preview
4. Validation based on node type schema

### Phase 3: CLI Sync Command (TASK-4)

1. `ginko sync` command structure
2. Conflict detection and resolution
3. File writing and git integration
4. Mark-as-synced API call

### Phase 4: Notifications (TASK-5)

1. Banner on dashboard when unsynced nodes exist
2. Warning in `ginko start` output
3. Badge on navigation

## Monitoring and Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync latency | < 2s per node | API response time |
| Conflict rate | < 5% of syncs | Conflicts / total syncs |
| Adoption | 50%+ edits via dashboard | Dashboard edits / total edits |
| User satisfaction | NPS > 30 | Post-beta survey |

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during conflict | High | Low | Always preserve both versions, never auto-delete |
| Stale sync status | Medium | Medium | Hash-based detection, not just timestamps |
| User forgets to sync | Medium | High | Prominent notifications, `ginko start` warnings |
| Git push fails after sync | Medium | Low | Rollback mechanism, clear error messages |

## Review and Updates

**Review Schedule:** Monthly during beta, quarterly after GA

**Update History:**
| Date | Author | Changes |
|------|--------|---------|
| 2025-12-15 | Chris Norton, Claude | Initial draft |

## References

- [ADR-041: Graph Migration and Write Dispatch](ADR-041-graph-migration-write-dispatch.md)
- [ADR-042: AI-Assisted Knowledge Graph Quality](ADR-042-ai-assisted-knowledge-graph-quality.md)
- [ADR-039: Graph-Based Context Discovery](ADR-039-graph-based-context-discovery.md)
- [Sprint: EPIC-005 Sprint 4](../sprints/SPRINT-2026-01-epic005-sprint4.md)
