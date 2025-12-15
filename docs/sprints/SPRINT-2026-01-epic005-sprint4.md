# SPRINT: Market Readiness Sprint 4 - Knowledge Editing + Beta Polish

## Sprint Overview

**Sprint Goal**: Enable knowledge node editing in the dashboard with git sync, and polish all features for beta launch.

**Duration**: 2 weeks
**Type**: Feature + Polish sprint
**Progress:** 20% (2/10 tasks complete)

**Success Criteria:**
- [ ] Knowledge nodes can be created and edited in dashboard
- [ ] CLI sync-on-demand pulls dashboard changes to git
- [ ] Notification system for unsynced nodes
- [ ] All features polished and ready for beta
- [ ] Documentation complete for beta users

---

## Sprint Tasks

### TASK-1: Knowledge Node Editor Architecture (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Design the knowledge editing flow between dashboard, graph, and git.

**Flow:**
1. User creates/edits node in dashboard
2. Changes stored in graph with `synced: false` flag
3. CLI checks for unsynced nodes at session start
4. CLI diffs graph vs git versions
5. CLI merges and pushes to git
6. Graph updated with `synced: true`

**Key Decisions:**
- Conflict resolution strategy (git wins, graph wins, or manual merge)
- Which node types are editable (ADRs, PRDs, Patterns, Gotchas, Charter)
- Validation rules for each node type

**Deliverables:**
- Architecture document
- Sync state diagram
- API design for edit operations

**Files:**
- `docs/adr/ADR-XXX-knowledge-editing-architecture.md` (new)

---

### TASK-2: Dashboard Node Editor Component (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Build the node editing interface in the dashboard.

**Features:**
- Create new node (select type, fill required fields)
- Edit existing node (load content, modify, save)
- Markdown editor with preview
- Form fields based on node type schema
- Validation before save
- "Pending Sync" indicator

**Node Type Schemas:**
- **ADR:** id, title, status, context, decision, consequences
- **PRD:** id, title, overview, requirements, success_criteria
- **Pattern:** id, name, description, example, when_to_use
- **Gotcha:** id, name, description, solution, severity

**Files:**
- `dashboard/src/components/graph/NodeEditor.tsx` (new)
- `dashboard/src/components/graph/NodeEditorForm.tsx` (new)
- `dashboard/src/components/graph/MarkdownEditor.tsx` (new)
- `dashboard/src/lib/node-schemas.ts` (new)

---

### TASK-3: Graph API for Node Mutations (4h)
**Status:** [x] Complete (2025-12-15)
**Priority:** HIGH

**Goal:** Add API endpoints for creating, updating, and tracking sync status.

**Implemented Endpoints:**
- PATCH `/api/v1/graph/nodes/:id` - Update existing node (partial update)
- GET `/api/v1/graph/nodes/unsynced` - List nodes pending sync
- POST `/api/v1/graph/nodes/:id/sync` - Mark node as synced
- Enhanced POST `/api/v1/graph/nodes` - Create new node with sync tracking

**Sync Tracking Schema:**
```typescript
interface NodeSyncStatus {
  synced: boolean;           // False until synced to git
  syncedAt: Date | null;     // Timestamp of last sync
  editedAt: Date;            // Timestamp of last edit
  editedBy: string;          // User email who edited
  contentHash: string;       // SHA-256 hash of content
  gitHash: string | null;    // Git commit hash when synced
}
```

**CloudGraphClient Extensions:**
- `patchNode(id, data, editedBy)` - Update with sync tracking
- `getUnsyncedNodes(limit)` - Query unsynced nodes
- `markNodeSynced(id, gitHash, syncedAt?)` - Mark as synced

**Files Created/Modified:**
- `dashboard/src/app/api/v1/graph/nodes/route.ts` (updated - sync tracking on create)
- `dashboard/src/app/api/v1/graph/nodes/[id]/route.ts` (new - PATCH + GET)
- `dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts` (new - GET unsynced)
- `dashboard/src/app/api/v1/graph/nodes/[id]/sync/route.ts` (new - POST sync)
- `dashboard/src/app/api/v1/graph/_cloud-graph-client.ts` (updated - 3 methods)
- `docs/adr/ADR-054-knowledge-editing-architecture.md` (new)
- `docs/implementation/TASK-3-graph-api-mutations.md` (new)
- `dashboard/src/app/api/v1/graph/nodes/TEST-ENDPOINTS.md` (new)

**Commit:** 40c49b6e6713552999196ae60eb81da898ab2b6b

---

### TASK-4: CLI Sync-on-Demand Command (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Implement CLI command to sync dashboard edits to git.

**Flow:**
```bash
ginko sync                # Check and sync all unsynced nodes
ginko sync --dry-run      # Show what would be synced without applying
ginko sync --force        # Overwrite git with graph versions (use carefully)
```

**Sync Process:**
1. Fetch unsynced nodes from graph API
2. For each node:
   a. Load corresponding file from git (if exists)
   b. Diff graph version vs git version
   c. If no conflict: write graph version to file
   d. If conflict: show diff, prompt for resolution (or auto-merge)
3. Stage and commit changes
4. Mark nodes as synced in graph

**Integration with `ginko start`:**
- Check for unsynced nodes at session start
- Display warning: "3 knowledge nodes edited in dashboard. Run `ginko sync` to pull changes."

**Files:**
- `packages/cli/src/commands/sync/index.ts` (new)
- `packages/cli/src/commands/sync/sync-command.ts` (new)
- `packages/cli/src/lib/sync/node-syncer.ts` (new)
- `packages/cli/src/lib/sync/diff-merger.ts` (new)

---

### TASK-5: Unsynced Node Notifications (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Implement notification system for unsynced knowledge nodes.

**Notification Channels:**
1. **CLI at session start** - Warning message with count
2. **Dashboard indicator** - Badge on nav item, banner on graph page
3. **Email notification** - Batch job for project owners (future enhancement)

**Implementation:**
- Dashboard: Check unsynced count on graph page load
- CLI: Query unsynced endpoint during `ginko start`
- Display actionable message with `ginko sync` command

**Files:**
- `dashboard/src/components/graph/UnsyncedBanner.tsx` (new)
- `packages/cli/src/commands/start/start-reflection.ts` (update)

---

### TASK-6: Dashboard Polish - Sessions Display Fix (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Update sessions display to use event stream data correctly.

**Current Issue:** Sessions section shows outdated data (not using continuous event stream)

**Fix:**
- Query recent events from graph
- Group events by session
- Display session timeline with event highlights
- Link to session log viewer

**Files:**
- `dashboard/src/components/sessions/SessionList.tsx` (update)
- `dashboard/src/components/sessions/SessionTimeline.tsx` (new)
- `dashboard/src/app/api/v1/sessions/route.ts` (update)

---

### TASK-7: Dashboard Polish - Navigation & Layout (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Final polish on dashboard navigation and layout consistency.

**Tasks:**
- Ensure all pages use consistent layout
- Add navigation for new pages (Graph, Insights)
- Mobile responsiveness check
- Loading states for all async content
- Error boundaries with friendly messages

**Files:**
- `dashboard/src/app/layout.tsx` (update)
- `dashboard/src/components/nav/Navigation.tsx` (update)
- Various page components

---

### TASK-8: Beta Documentation (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create user-facing documentation for beta launch.

**Documentation:**
- Getting Started guide (updated)
- Dashboard user guide
- Graph visualization guide
- Coaching insights guide
- Knowledge editing and sync workflow
- Troubleshooting / FAQ

**Files:**
- `docs/guides/GETTING-STARTED.md` (update)
- `docs/guides/DASHBOARD.md` (new)
- `docs/guides/GRAPH-VISUALIZATION.md` (new)
- `docs/guides/COACHING-INSIGHTS.md` (new)
- `docs/guides/KNOWLEDGE-EDITING.md` (new)

---

### TASK-9: Beta Testing Checklist (3h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create and execute beta testing checklist.

**Test Scenarios:**
1. Fresh user onboarding flow
2. CLI installation and first session
3. Graph visualization with sample data
4. Insights generation and display
5. Knowledge node creation and sync
6. Cross-browser testing (Chrome, Firefox, Safari)
7. Error handling and edge cases

**Deliverables:**
- Test checklist document
- Bug list with priorities
- Sign-off criteria for beta launch

**Files:**
- `docs/BETA-TESTING-CHECKLIST.md` (new)

---

### TASK-10: Beta Launch Preparation (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Final preparations for beta launch.

**Tasks:**
- Version bump to 1.0.0-beta.1
- Changelog update
- npm publish (if ready)
- Marketing site updates with beta messaging
- GitHub release with notes
- Social media / announcement prep

**Files:**
- `package.json` (version bump)
- `CHANGELOG.md` (update)
- `website/index.html` (beta messaging)
- GitHub release notes

---

## Accomplishments This Sprint

### 2025-12-15: TASK-2 Complete - Dashboard Node Editor Component

**Components Implemented:**
- **NodeEditor.tsx** - Main editor component with create/update logic, API integration, loading states, and sync status tracking
- **NodeEditorForm.tsx** - Type-specific form rendering for ADR, PRD, Pattern, Gotcha, and Charter nodes
- **MarkdownEditor.tsx** - Dual-pane markdown editor with live preview, syntax highlighting, and expand mode
- **node-schemas.ts** - Comprehensive validation schemas for all editable node types with field configs

**Features:**
- Complete CRUD operations for knowledge nodes
- Type-safe form validation with detailed error messages
- Markdown editing with real-time preview and code syntax highlighting
- "Pending Sync" indicators for unsynced nodes
- Proper TypeScript types throughout
- Error handling and loading states
- Integration with existing graph API client

**Impact:**
- Users can now create and edit knowledge nodes directly in dashboard
- Foundation for TASK-4 CLI sync implementation
- Reusable components for future editing features
- Strong data integrity through validation

**Files:**
- `dashboard/src/components/graph/NodeEditor.tsx`
- `dashboard/src/components/graph/NodeEditorForm.tsx`
- `dashboard/src/components/graph/MarkdownEditor.tsx`
- `dashboard/src/lib/node-schemas.ts`
- `dashboard/src/components/graph/index.ts` (updated exports)

---

## Previous Accomplishments

### 2025-12-15: TASK-3 - Graph API for Node Mutations
**Status:** Complete
**Impact:** Foundation for dashboard knowledge editing and CLI sync

**What was built:**
- Implemented 3 new REST API endpoints for node mutations with git sync tracking
- PATCH `/api/v1/graph/nodes/:id` - Update existing nodes with partial data
- GET `/api/v1/graph/nodes/unsynced` - Query nodes pending git sync
- POST `/api/v1/graph/nodes/:id/sync` - Mark nodes as synced after git commit
- Enhanced POST `/api/v1/graph/nodes` to create nodes with sync tracking metadata

**Technical Details:**
- Full sync tracking schema per ADR-054: synced, syncedAt, editedAt, editedBy, contentHash, gitHash
- Extended CloudGraphClient with 3 methods: patchNode(), getUnsyncedNodes(), markNodeSynced()
- Content hashing (SHA-256) for conflict detection during sync
- Proper error handling: 400/401/404/503 responses with clear messages
- Build passes, test guide created, ready for production deployment

**Why this matters:**
- Unblocks TASK-2 (Dashboard Node Editor) - can now save edits with sync tracking
- Enables TASK-4 (CLI Sync Command) - can query unsynced nodes and mark as synced
- Foundation for bidirectional sync: dashboard → graph → git → CLI

**Files:**
- 5 new API route files
- ADR-054 (Knowledge Editing Architecture) documented
- Implementation summary with test guide

**Commit:** 40c49b6e6713552999196ae60eb81da898ab2b6b

## Next Steps

[To be updated during sprint]

## Blockers

[To be updated if blockers arise]

---

## Beta Launch Readiness Checklist

### Product
- [ ] All EPIC-005 success criteria met
- [ ] No critical bugs in backlog
- [ ] Performance acceptable (< 2s startup, responsive UI)

### Documentation
- [ ] Getting started guide complete
- [ ] All feature guides written
- [ ] Troubleshooting section populated

### Marketing
- [ ] Tagline and positioning finalized
- [ ] Website updated with beta messaging
- [ ] GitHub README polished

### Technical
- [ ] Version 1.0.0-beta.1 published to npm
- [ ] Dashboard deployed to production
- [ ] Graph database stable

### Communication
- [ ] Beta announcement drafted
- [ ] Feedback channel established (GitHub Issues)
- [ ] Support process defined
