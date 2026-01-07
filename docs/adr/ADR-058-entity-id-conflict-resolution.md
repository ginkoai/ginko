# ADR-058: Entity ID Conflict Resolution

## Status
Accepted

## Date
2026-01-07

## Context

With team collaboration enabled (EPIC-008), multiple team members can create entities (Epics, Sprints, Tasks) independently before syncing to the shared graph. This creates a risk of ID collisions when two users create entities with the same ID.

### Current Problem

When two team members independently create an entity with the same ID (e.g., both create EPIC-010):

1. **First user syncs** - Entity created in graph
2. **Second user syncs** - Neo4j `MERGE` silently **overwrites** the first user's content
3. **No warning, no conflict detection** - First user's work is lost

This happened in practice: Reese synced EPIC-010 with 4 sprints, then xtophr had a local EPIC-010 that would silently overwrite Reese's work.

### Why This Happens

The current sync uses Neo4j `MERGE` with ID as the key:

```cypher
MERGE (e:Epic {id: $id, graphId: $graphId})
ON MATCH SET e.title = $title, ...
```

This is "last write wins" semantics - useful for updates by the same author, but dangerous for ID collisions between different authors.

## Decision

### First-Claim-Wins with Rename Suggestion

When syncing an entity, check if the ID already exists in the graph:

1. **If ID doesn't exist** - Create normally
2. **If ID exists AND same creator** - Allow update (normal behavior)
3. **If ID exists AND different creator** - Block sync, alert user, suggest next available ID

### Implementation

```typescript
// Pre-sync validation
interface IdConflictCheck {
  exists: boolean;
  createdBy?: string;
  suggestedId?: string; // Next available ID if conflict
}

async function checkIdConflict(
  type: 'Epic' | 'Sprint' | 'Task',
  id: string,
  currentUser: string,
  graphId: string
): Promise<IdConflictCheck> {
  // Query graph for existing entity
  const existing = await queryNode(type, id, graphId);

  if (!existing) {
    return { exists: false };
  }

  if (existing.createdBy === currentUser) {
    return { exists: true }; // Allow update
  }

  // Conflict! Find next available ID
  const suggestedId = await findNextAvailableId(type, id, graphId);

  return {
    exists: true,
    createdBy: existing.createdBy,
    suggestedId,
  };
}
```

### User Experience

When conflict detected during `ginko sync`:

```
⚠️  ID Conflict: EPIC-010 already exists
   Created by: reese@company.com on 2026-01-06
   Title: "Analytics Dashboard"

Your version: "Performance Optimization"

Options:
  1. Rename to e011 (recommended)
  2. Skip this epic
  3. Cancel sync

? Choose an option: › 1

✓ Renamed EPIC-010 → EPIC-011
✓ Synced 1 epic
```

### Storing Creator Information

Add `createdBy` to all entity nodes:

```cypher
MERGE (e:Epic {id: $id, graphId: $graphId})
ON CREATE SET
  e.createdBy = $userId,
  e.createdAt = datetime()
ON MATCH SET
  e.updatedBy = $userId,
  e.updatedAt = datetime()
```

### Finding Next Available ID

```typescript
async function findNextAvailableId(
  type: 'Epic' | 'Sprint' | 'Task',
  conflictId: string,
  graphId: string
): Promise<string> {
  // Parse current ID: e010 → { prefix: 'e', num: 10 }
  const parsed = parseEntityId(conflictId);

  // Query all existing IDs of this type
  const existingIds = await queryExistingIds(type, parsed.prefix, graphId);

  // Find max number and suggest next
  const maxNum = Math.max(...existingIds.map(id => parseEntityId(id).num));

  return formatEntityId(parsed.prefix, maxNum + 1);
}
```

## Consequences

### Positive
- **No silent data loss** - First creator's work is protected
- **Simple mental model** - "First claim wins" is easy to understand
- **Graceful recovery** - User can rename and continue, no work lost
- **Audit trail** - `createdBy` field tracks ownership

### Negative
- **Requires migration** - Add `createdBy` to existing nodes (can default to graph owner)
- **Sync interruption** - Conflict blocks sync until resolved
- **ID gaps** - If user renames e010 → e011, original local file may still reference e010

### Neutral
- **Local file update** - After rename, user must update local markdown file with new ID
- **Sprint/Task inheritance** - Renaming an Epic requires updating child Sprint/Task IDs

## Alternatives Considered

### User-Prefixed IDs
`xtophr_e010` vs `reese_e010`

**Rejected:** Creates fragmented namespace, complicates references, orphaned IDs when users leave.

### Locking IDs
Creator-locked modification rights.

**Rejected:** Too rigid - legitimate handoffs become blocked.

### Merge UI
Dashboard shows conflict, user picks winner.

**Rejected:** Too complex for MVP; sync should work from CLI without browser.

## Implementation Plan

1. **Add `createdBy` tracking** - Update sync queries to store creator
2. **Migration** - Set `createdBy` on existing nodes (default to graph owner)
3. **Pre-sync check** - Query for ID conflicts before MERGE
4. **CLI prompts** - Interactive conflict resolution
5. **Local file guidance** - Tell user to update local file after rename

## Related

- ADR-052: Unified Entity Naming Convention
- ADR-054: Knowledge Editing Architecture
- EPIC-008: Team Collaboration
