# Context API - Initial Load Endpoint

## Overview

Consolidated API endpoint for initial context loading in `ginko start`.

**Performance Improvement:**
- Before: 4-5 sequential API calls (~10-15 seconds)
- After: 1 API call with server-side graph operations (~2-3 seconds)
- **5-7x faster context loading**

## Endpoint

```
GET /api/v1/context/initial-load
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cursorId` | string | ✅ Yes | - | Session cursor ID (event pointer) |
| `userId` | string | ✅ Yes | - | User ID |
| `projectId` | string | ✅ Yes | - | Project ID |
| `eventLimit` | number | No | 50 | Number of user events to load |
| `includeTeam` | boolean | No | false | Include team events |
| `teamEventLimit` | number | No | 20 | Number of team events |
| `teamDays` | number | No | 7 | Team events from last N days |
| `documentDepth` | number | No | 2 | Graph relationship traversal depth |
| `categories` | string | No | - | Comma-separated event categories |
| `branch` | string | No | - | Filter by git branch |

## Response

```typescript
interface InitialLoadResponse {
  cursor: {
    id: string;
    current_event_id: string;
  };
  myEvents: Event[];           // User's recent events
  teamEvents?: Event[];        // Team high-signal events
  documents: KnowledgeNode[];  // Documents referenced in events
  relatedDocs: KnowledgeNode[]; // Related via graph relationships
  sprint?: Sprint;             // Active sprint
  loaded_at: string;           // ISO timestamp
  event_count: number;
  token_estimate: number;      // Estimated context tokens
  performance: {
    queryTimeMs: number;
    eventsLoaded: number;
    documentsLoaded: number;
    relationshipsTraversed: number;
  };
}
```

## Example Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://app.ginkoai.com/api/v1/context/initial-load?cursorId=evt_123&userId=user_456&projectId=proj_789&eventLimit=50&includeTeam=true"
```

## Example Response

```json
{
  "cursor": {
    "id": "evt_1762530277412_3ziib6",
    "current_event_id": "evt_1762530277412_3ziib6"
  },
  "myEvents": [
    {
      "id": "evt_123",
      "user_id": "user_456",
      "project_id": "proj_789",
      "timestamp": "2025-11-07T12:00:00Z",
      "category": "fix",
      "description": "Fixed sprint loading performance bottleneck",
      "files": ["packages/cli/src/lib/context-loader-events.ts"],
      "impact": "high"
    }
  ],
  "teamEvents": [],
  "documents": [
    {
      "id": "ADR-043",
      "type": "ADR",
      "title": "Event-Based Context Loading",
      "content": "..."
    }
  ],
  "relatedDocs": [
    {
      "id": "ADR-042",
      "type": "ADR",
      "title": "Typed Graph Relationships"
    }
  ],
  "sprint": {
    "id": "SPRINT-2025-10-27-cloud-knowledge-graph",
    "title": "Cloud-First Knowledge Graph Platform",
    "progress": 26,
    "started": "2025-10-27T00:00:00Z"
  },
  "loaded_at": "2025-11-07T12:00:00Z",
  "event_count": 50,
  "token_estimate": 5500,
  "performance": {
    "queryTimeMs": 2340,
    "eventsLoaded": 50,
    "documentsLoaded": 12,
    "relationshipsTraversed": 8
  }
}
```

## What It Does (Server-Side)

1. **Read Events Backward** - Fetch user's recent events from cursor position
2. **Load Team Events** - Get high-signal team events (decisions, achievements, git ops)
3. **Extract Document References** - Parse ADR/PRD/TASK refs from event descriptions
4. **Load Documents** - Batch fetch referenced knowledge nodes
5. **Follow Relationships** - Graph traversal for related documents (IMPLEMENTS, REFERENCES, DEPENDS_ON)
6. **Get Active Sprint** - Load current sprint from graph
7. **Calculate Token Estimate** - Estimate context size

All operations are performed server-side in a single transaction, dramatically reducing network latency.

## Database Queries

Uses Neo4j Cypher queries for efficient graph operations:

```cypher
// Read events backward
MATCH (e:Event {project_id: $projectId, user_id: $userId})
WHERE e.id <= $fromEventId
RETURN e
ORDER BY e.timestamp DESC
LIMIT 50

// Follow typed relationships
MATCH (d:Document)-[r:IMPLEMENTS|REFERENCES|DEPENDS_ON*1..2]-(related:Document)
WHERE d.id IN $documentIds
RETURN DISTINCT related
LIMIT 50
```

## Deployment

This is a Vercel serverless function. To deploy:

```bash
# Deploy to Vercel
vercel --prod

# Or via GitHub Actions (auto-deploy on merge to main)
git push origin main
```

## Environment Variables

Required for Neo4j connection:

```bash
NEO4J_URI=bolt://your-neo4j-instance:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

## CLI Integration

The CLI automatically uses this endpoint when available:

```typescript
// packages/cli/src/lib/context-loader-events.ts
export async function loadContextFromCursor(cursor, options) {
  try {
    // Try consolidated endpoint (fast)
    return await loadContextConsolidated(cursor, options);
  } catch {
    // Fallback to multi-call approach
    // ... original implementation
  }
}
```

## Performance Metrics

**Before (Multi-Call):**
- readEventsBackward: ~2s
- loadTeamEvents: ~2s
- loadDocuments: ~3s
- followTypedRelationships: ~4s (N calls in loop)
- getActiveSprint: ~3s (25 file reads)
- **Total: ~14s**

**After (Consolidated):**
- Single API call: ~2-3s
- **~5-7x improvement**

## Future Enhancements

1. **Caching** - Redis cache for frequently accessed documents
2. **Pagination** - Support for loading more events on demand
3. **Compression** - gzip response for large context loads
4. **Streaming** - Server-sent events for real-time updates
5. **Graph from File Fallback** - When graph is unavailable, read from local files

## Related Files

- API Implementation: `api/v1/context/initial-load.ts`
- CLI Integration: `packages/cli/src/lib/context-loader-events.ts`
- ADR: `docs/adr/ADR-043-event-based-context-loading.md`
