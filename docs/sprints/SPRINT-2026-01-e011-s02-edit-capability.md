# SPRINT: Graph Explorer v2 Sprint 2 - Edit Capability & Sync

## Sprint Overview

**Sprint Goal**: Enable in-place editing with bidirectional git sync
**Duration**: 1-2 weeks
**Type**: Feature sprint
**Progress:** 100% (6/6 tasks complete)
**Prerequisite:** Sprint 1 complete (Hierarchy Navigation UI)

**Status:** ✅ COMPLETE

**Success Criteria:**
- [x] Users can edit ADR/Pattern/Gotcha content in explorer
- [x] Changes sync back to git-native markdown files
- [x] Node creation UI works (Create ADR, Create Pattern)
- [x] Edit history visible in node detail
- [x] Edit conflicts handled gracefully

---

## Design Specifications

### Editable Node Types

| Type | Editable Fields | Sync Target |
|------|-----------------|-------------|
| ADR | title, status, content | `docs/adr/ADR-{NNN}-*.md` |
| Pattern | title, content | `docs/patterns/*.md` |
| Gotcha | title, content | `docs/gotchas/*.md` |
| Charter | title, content | `docs/PROJECT-CHARTER.md` |
| Epic | title, description | `docs/epics/EPIC-{NNN}-*.md` |
| Sprint | title, goal, tasks | `docs/sprints/SPRINT-*.md` |

**Non-Editable:** Event, Commit (auto-generated from git)

### Edit Modal Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Edit ADR-056: Roadmap as Epic View                    [x]   │
├─────────────────────────────────────────────────────────────┤
│ Title: [Roadmap as Epic View                           ]    │
│                                                             │
│ Status: [Accepted ▼]                                        │
│                                                             │
│ Content:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ## Context                                              │ │
│ │                                                         │ │
│ │ The roadmap canvas needs a way to visualize epics...    │ │
│ │                                                         │ │
│ │ ## Decision                                             │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Last edited: 2026-01-10 by chris@watchhill.ai               │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save to Graph+Git]  │
└─────────────────────────────────────────────────────────────┘
```

### Create Node Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Create New ADR                                        [x]   │
├─────────────────────────────────────────────────────────────┤
│ ADR Number: [061] (auto-incremented)                        │
│                                                             │
│ Title: [                                               ]    │
│                                                             │
│ Status: [Proposed ▼]                                        │
│                                                             │
│ Content:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ## Context                                              │ │
│ │                                                         │ │
│ │ [Describe the context and problem...]                   │ │
│ │                                                         │ │
│ │ ## Decision                                             │ │
│ │                                                         │ │
│ │ [Describe the decision...]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                    [Cancel]  [Create ADR]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Sprint Tasks

### e011_s02_t01: Fix Edit Modal Content Loading (2h)
**Status:** [x] Complete
**Priority:** HIGH - Carries over BUG-002 fix verification
**Assignee:** TBD

**Goal:** Ensure edit modal loads existing content correctly for all node types

**Context:**
BUG-002 was addressed in Sprint 1 (t06), but this task verifies the fix works across all editable types and adds any missing functionality.

**Implementation:**
1. Verify NodeEditorModal loads content for ADR, Pattern, Gotcha
2. Verify content field is populated before modal opens
3. Add loading state while fetching full node content
4. Handle error case if content fetch fails

**Files:**
- `dashboard/src/components/graph/NodeEditorModal.tsx`
- `dashboard/src/lib/graph/api-client.ts`

**Acceptance Criteria:**
- [x] Edit modal shows existing content for ADRs
- [x] Edit modal shows existing content for Patterns
- [x] Edit modal shows existing content for Gotchas
- [x] Loading spinner shown while fetching
- [x] Error toast if fetch fails

---

### e011_s02_t02: Implement Save to Graph API (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Save edited content back to Neo4j graph

**Implementation:**
1. Add PUT endpoint for node updates: `PUT /api/v1/graph/nodes/:id`
2. Update node properties in Neo4j
3. Return updated node with new `updated_at` timestamp
4. Handle validation errors (required fields, etc.)

**API Design:**
```typescript
// PUT /api/v1/graph/nodes/:id
{
  title: string;
  content: string;
  status?: string;  // For ADRs
  metadata?: Record<string, unknown>;
}

// Response
{
  success: true;
  node: GraphNode;
  updated_at: string;
}
```

**Files:**
- `packages/api/src/routes/graph/nodes.ts` (or equivalent)
- `dashboard/src/lib/graph/api-client.ts` - Add updateNode method

**Acceptance Criteria:**
- [x] PUT endpoint accepts node updates
- [x] Neo4j node properties updated correctly
- [x] Updated timestamp reflects save time
- [x] Validation errors return 400 with details
- [x] Non-existent node returns 404

---

### e011_s02_t03: Implement Git Sync on Save (6h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Sync graph edits back to git-native markdown files

**Implementation:**
1. After graph save, trigger git file sync
2. Map node type to file path pattern
3. Update markdown file with new content
4. Preserve frontmatter structure
5. Auto-commit with descriptive message

**File Path Mapping:**
```typescript
const FILE_PATTERNS = {
  ADR: (node) => `docs/adr/ADR-${node.number}-${slugify(node.title)}.md`,
  Pattern: (node) => `docs/patterns/${slugify(node.title)}.md`,
  Gotcha: (node) => `docs/gotchas/${slugify(node.title)}.md`,
  Charter: () => `docs/PROJECT-CHARTER.md`,
  Epic: (node) => `docs/epics/EPIC-${node.number}-${slugify(node.title)}.md`,
  Sprint: (node) => `docs/sprints/SPRINT-${node.id}.md`,
};
```

**Commit Message Format:**
```
docs(adr): Update ADR-056 - Roadmap as Epic View

Updated via Graph Explorer dashboard.

Co-Authored-By: Chris Norton <chris@watchhill.ai>
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Files:**
- New: `packages/api/src/lib/git-sync.ts`
- `packages/api/src/routes/graph/nodes.ts` - Call git sync after save

**Acceptance Criteria:**
- [x] ADR edits sync to `docs/adr/*.md`
- [x] Pattern edits sync to `docs/patterns/*.md`
- [x] Gotcha edits sync to `docs/gotchas/*.md`
- [x] Frontmatter preserved in synced files
- [x] Auto-commit created with proper message
- [x] Sync failure doesn't break graph save (graceful degradation)

---

### e011_s02_t04: Add Node Creation UI (5h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Allow users to create new ADRs, Patterns, and Gotchas from the dashboard

**Implementation:**
1. Add "Create" button to Nav Tree sections
2. Open creation modal with empty template
3. Auto-increment ADR numbers
4. Create node in graph + git file
5. Navigate to new node after creation

**UI Placement:**
```
📚 Knowledge
├── ADRs (24) [+]      ← Create button
│   ├── ADR-001
│   └── ...
├── Patterns (8) [+]   ← Create button
└── Gotchas (5) [+]    ← Create button
```

**Templates:**
- ADR: Standard ADR template with Context/Decision/Consequences
- Pattern: Title + Description + Example
- Gotcha: Title + Problem + Solution

**Files:**
- `dashboard/src/components/graph/tree-explorer.tsx` - Add create buttons
- New: `dashboard/src/components/graph/CreateNodeModal.tsx`
- `dashboard/src/lib/graph/api-client.ts` - Add createNode method

**Acceptance Criteria:**
- [x] Create button visible on ADR/Pattern/Gotcha sections
- [x] Creation modal opens with appropriate template
- [x] ADR number auto-incremented from highest existing
- [x] New node created in graph and git
- [x] User navigated to new node after creation
- [x] Validation prevents empty title

---

### e011_s02_t05: Add Edit History Display (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Show edit history on node detail cards

**Implementation:**
1. Track edits with timestamp and author
2. Display "Last edited" line on detail cards
3. Add "History" expandable section for full audit trail
4. Query git log for file history as fallback

**Display:**
```
Last edited: 2026-01-15 by chris@watchhill.ai

▼ History (3 edits)
  2026-01-15 - chris@watchhill.ai - Updated decision section
  2026-01-10 - chris@watchhill.ai - Added consequences
  2026-01-05 - chris@watchhill.ai - Initial creation
```

**Data Model:**
```typescript
interface NodeEdit {
  timestamp: string;
  author: string;
  summary?: string;
}
```

**Files:**
- `dashboard/src/components/graph/NodeView.tsx` - Add history section
- New: `dashboard/src/components/graph/EditHistory.tsx`
- `packages/api/src/routes/graph/nodes.ts` - Add history endpoint

**Acceptance Criteria:**
- [x] "Last edited" shown on detail cards
- [x] History section expandable
- [x] Edit history fetched from graph or git
- [x] Author and timestamp displayed for each edit

---

### e011_s02_t06: Handle Edit Conflicts (4h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Gracefully handle conflicts when git file was modified externally

**Conflict Scenarios:**
1. User edits in dashboard while file changed in git
2. Two users edit same node simultaneously
3. Graph state diverges from git state

**Implementation:**
1. Check file hash before saving
2. If hash mismatch, show conflict dialog
3. Offer options: Overwrite, Merge, Cancel
4. For merge, show diff view
5. Track "last_synced_hash" on node

**Conflict Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Conflict Detected                                [x]   │
├─────────────────────────────────────────────────────────────┤
│ This file was modified externally since you started         │
│ editing.                                                    │
│                                                             │
│ External change: 2026-01-16 10:30 (git commit abc123)       │
│ Your edit started: 2026-01-16 10:15                         │
│                                                             │
│ Options:                                                    │
│ • Overwrite - Replace external changes with yours           │
│ • View Diff - See what changed                              │
│ • Cancel - Discard your changes                             │
├─────────────────────────────────────────────────────────────┤
│                    [Cancel]  [View Diff]  [Overwrite]       │
└─────────────────────────────────────────────────────────────┘
```

**Files:**
- New: `dashboard/src/components/graph/ConflictDialog.tsx`
- `dashboard/src/components/graph/NodeEditorModal.tsx` - Add conflict check
- `packages/api/src/lib/git-sync.ts` - Add hash comparison

**Acceptance Criteria:**
- [x] Conflict detected when file changed externally
- [x] User shown clear conflict dialog
- [x] Overwrite option works correctly
- [x] Cancel discards user changes safely
- [x] View Diff shows meaningful comparison

---

## Technical Notes

### API Endpoints

```typescript
// Update existing node
PUT /api/v1/graph/nodes/:id
Body: { title, content, status?, metadata? }
Response: { success, node, updated_at }

// Create new node
POST /api/v1/graph/nodes
Body: { type, title, content, metadata? }
Response: { success, node, file_path }

// Get node history
GET /api/v1/graph/nodes/:id/history
Response: { edits: NodeEdit[] }

// Check for conflicts
GET /api/v1/graph/nodes/:id/sync-status
Response: { in_sync: boolean, local_hash, remote_hash }
```

### Git Sync Architecture

```
Dashboard Edit
      │
      ▼
┌─────────────┐
│ Graph API   │ ──► Update Neo4j
└─────────────┘
      │
      ▼
┌─────────────┐
│ Git Sync    │ ──► Update markdown file
└─────────────┘     ──► Auto-commit
      │
      ▼
┌─────────────┐
│ Response    │ ──► { success, node, commit_sha }
└─────────────┘
```

### Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Graph save failed | "Failed to save changes" | Retry button |
| Git sync failed | "Saved to graph, git sync pending" | Background retry |
| Conflict detected | Conflict dialog | User choice |
| Validation error | Field-specific error | Fix and retry |

---

## Dependencies

- Sprint 1 complete (hierarchy navigation working)
- Git repository accessible from API server
- Neo4j write permissions configured
- File system write access for markdown files

---

## Sprint Metadata

**Epic:** EPIC-011 (Graph Explorer v2)
**Sprint ID:** e011_s02
**Created:** 2026-01-16
**Participants:** TBD
