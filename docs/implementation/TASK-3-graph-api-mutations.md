# TASK-3: Graph API for Node Mutations - Implementation Summary

**Epic:** EPIC-005 Sprint 4 - Market Readiness
**Status:** Complete
**Date:** 2025-12-15
**Author:** Claude Opus 4.5, Chris Norton

## Overview

Implemented three new API endpoints for knowledge node mutations with git sync tracking, as specified in ADR-054 (Knowledge Editing Architecture).

## What Was Built

### 1. PATCH `/api/v1/graph/nodes/:id` - Update Existing Node

**File:** `/dashboard/src/app/api/v1/graph/nodes/[id]/route.ts`

**Features:**
- Partial node updates (only update provided fields)
- Automatic sync tracking:
  - Sets `synced = false`
  - Records `editedAt = now()`
  - Records `editedBy = userId`
  - Computes `contentHash` (SHA-256) if content changed
- Returns updated node with full sync status
- Proper error handling (404 for missing nodes, 401 for auth)

**Example:**
```typescript
PATCH /api/v1/graph/nodes/adr_001?graphId=abc123
Body: { title: "Updated Title", content: "New content" }

Response: {
  node: { id, title, content, synced: false, editedAt, editedBy, contentHash, ... },
  syncStatus: { synced: false, syncedAt: null, editedAt, editedBy, contentHash, gitHash: null }
}
```

### 2. GET `/api/v1/graph/nodes/unsynced` - List Pending Sync Nodes

**File:** `/dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts`

**Features:**
- Query nodes where `synced = false` or `synced IS NULL`
- Filters by editable node types: ADR, PRD, Pattern, Gotcha, Charter
- Returns nodes with full sync metadata
- Supports pagination via `limit` parameter (max 500)
- Ordered by `editedAt DESC` (most recently edited first)

**Example:**
```typescript
GET /api/v1/graph/nodes/unsynced?graphId=abc123&limit=50

Response: {
  nodes: [
    { node: {...}, syncStatus: {...}, label: "ADR" },
    { node: {...}, syncStatus: {...}, label: "Pattern" }
  ],
  count: 2,
  graphId: "abc123"
}
```

### 3. POST `/api/v1/graph/nodes/:id/sync` - Mark Node as Synced

**File:** `/dashboard/src/app/api/v1/graph/nodes/[id]/sync/route.ts`

**Features:**
- Called by CLI after successful git commit
- Sets `synced = true`
- Records `syncedAt = now()`
- Stores `gitHash` for version tracking
- Returns success confirmation with sync metadata

**Example:**
```typescript
POST /api/v1/graph/nodes/adr_001/sync?graphId=abc123
Body: { gitHash: "a1b2c3d4e5f6" }

Response: {
  success: true,
  nodeId: "adr_001",
  synced: true,
  syncedAt: "2025-12-15T14:35:00.000Z",
  gitHash: "a1b2c3d4e5f6"
}
```

### 4. CloudGraphClient Extensions

**File:** `/dashboard/src/app/api/v1/graph/_cloud-graph-client.ts`

**New Methods:**
- `patchNode(id, data, editedBy)` - Update node with sync tracking
- `getUnsyncedNodes(limit)` - Query unsynced nodes
- `markNodeSynced(id, gitHash, syncedAt?)` - Mark as synced

These methods provide a clean TypeScript interface for server-side code.

### 5. Updated POST `/api/v1/graph/nodes` - Create with Sync Tracking

**File:** `/dashboard/src/app/api/v1/graph/nodes/route.ts`

**Enhancement:**
- All new nodes created with sync tracking fields:
  - `synced: false` (new nodes need sync to git)
  - `editedAt: now()`
  - `editedBy: "dashboard"` (TODO: extract from token)
  - `contentHash: SHA-256(content)`
  - `gitHash: null`

## Sync Tracking Schema

All knowledge nodes now include these fields (per ADR-054):

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

## Files Created/Modified

### Created:
- `/dashboard/src/app/api/v1/graph/nodes/[id]/route.ts` (PATCH + GET handlers)
- `/dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts` (GET handler)
- `/dashboard/src/app/api/v1/graph/nodes/[id]/sync/route.ts` (POST handler)
- `/dashboard/src/app/api/v1/graph/nodes/TEST-ENDPOINTS.md` (test guide)
- `/docs/implementation/TASK-3-graph-api-mutations.md` (this file)

### Modified:
- `/dashboard/src/app/api/v1/graph/_cloud-graph-client.ts` (added 3 methods)
- `/dashboard/src/app/api/v1/graph/nodes/route.ts` (enhanced POST with sync tracking)

## Technical Implementation Details

### Authentication
- Uses Bearer token from `Authorization` header
- Extracts userId via helper function (MVP: base64 encoding)
- TODO: Replace with Supabase auth verification (production)

### Content Hashing
- Uses Node.js `crypto.createHash('sha256')`
- Computed for `content` field when present
- Used for conflict detection during sync

### Error Handling
- 400: Missing required params (graphId, gitHash)
- 401: Missing or invalid auth token
- 404: Node not found in specified graph
- 503: Neo4j database unavailable
- 500: Internal errors with descriptive messages

### Query Patterns
- Uses Neo4j session management from `_neo4j.ts`
- Supports both `graph_id` and `graphId` property names (backward compat)
- Uses `executeRead` for queries, `executeWrite` for mutations
- Always closes sessions in `finally` blocks

## Integration with Sprint Tasks

### TASK-2: Dashboard Node Editor (Next)
- Dashboard will call `PATCH /nodes/:id` to save edits
- Will display sync status from response
- Will show "Pending Sync" badge when `synced = false`

### TASK-4: CLI Sync Command (Next)
- CLI will call `GET /nodes/unsynced` at session start
- Will display warning: "X nodes edited in dashboard"
- `ginko sync` will:
  1. Fetch unsynced nodes
  2. Write to local files
  3. Git commit
  4. Call `POST /nodes/:id/sync` with commit hash

### TASK-5: Unsynced Notifications (Next)
- Dashboard will query unsynced count on page load
- CLI will check unsynced during `ginko start`
- Both will display actionable prompts

## Testing

### Build Status
✅ Dashboard builds successfully: `npm run build` passes

### Manual Testing
See `/dashboard/src/app/api/v1/graph/nodes/TEST-ENDPOINTS.md` for curl examples.

**Test Workflow:**
1. Create test node → verify `synced: false`
2. Update node → verify `contentHash` changes, `synced` remains false
3. Query unsynced → verify node appears in list
4. Mark as synced → verify `synced: true`, `gitHash` set
5. Query unsynced again → verify node no longer appears

### Production Deployment
Ready to deploy to Vercel:
```bash
cd dashboard
npm run build
vercel --prod
```

## Alignment with ADR-054

This implementation fully satisfies ADR-054 requirements:

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Partial node updates | ✅ | PATCH endpoint with dynamic SET clause |
| Sync status tracking | ✅ | 6 sync fields on all nodes |
| List unsynced nodes | ✅ | GET /unsynced with filtering |
| Mark as synced | ✅ | POST /sync with gitHash |
| Content hashing | ✅ | SHA-256 on content field |
| Edit metadata | ✅ | editedAt, editedBy tracked |
| Git version tracking | ✅ | gitHash stored on sync |

## Known Limitations

1. **User ID Extraction:** Currently uses base64 encoding of token. Should be replaced with Supabase JWT verification.

2. **Content Hash on Read:** Only computed on write. Could precompute for all existing nodes via migration.

3. **Conflict Detection:** Hash comparison only. Advanced 3-way merge not yet implemented.

4. **Batch Operations:** No batch update/sync endpoints yet. Would improve CLI performance.

## Next Steps

1. **TASK-2:** Build dashboard node editor to call these APIs
2. **TASK-4:** Implement CLI `ginko sync` command
3. **TASK-5:** Add unsynced node notifications
4. **Migration:** Run Cypher script to add sync fields to existing nodes:
   ```cypher
   MATCH (n:ADR|PRD|Pattern|Gotcha|Charter)
   WHERE n.synced IS NULL
   SET n.synced = true,
       n.syncedAt = datetime(),
       n.editedAt = coalesce(n.updatedAt, n.createdAt, datetime()),
       n.editedBy = 'system',
       n.contentHash = '',
       n.gitHash = ''
   ```

## Success Metrics

- ✅ All 3 endpoints implemented
- ✅ Sync tracking schema matches ADR-054
- ✅ TypeScript types defined
- ✅ Error handling complete
- ✅ Build passes without errors
- ✅ Test guide created
- ⏳ Manual testing pending production deployment
- ⏳ Integration with CLI pending TASK-4

## References

- [ADR-054: Knowledge Editing Architecture](../adr/ADR-054-knowledge-editing-architecture.md)
- [Sprint: EPIC-005 Sprint 4](../sprints/SPRINT-2026-01-epic005-sprint4.md)
- [Test Guide](../../dashboard/src/app/api/v1/graph/nodes/TEST-ENDPOINTS.md)
- [CloudGraphClient](../../dashboard/src/app/api/v1/graph/_cloud-graph-client.ts)

---

**Implementation Time:** ~2 hours
**Complexity:** Medium
**Risk:** Low (additive changes, no breaking changes to existing APIs)
