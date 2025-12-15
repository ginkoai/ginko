# Node Mutations API - Test Guide

This document provides test examples for the new node mutation endpoints (TASK-3: EPIC-005 Sprint 4).

## Prerequisites

```bash
# Set environment variables
export GINKO_BEARER_TOKEN="your-token-here"
export GINKO_GRAPH_ID="your-graph-id-here"
```

## Endpoints

### 1. PATCH /api/v1/graph/nodes/:id

Update an existing node (partial update). Sets `synced=false` and tracks edit metadata.

```bash
curl -X PATCH "https://app.ginkoai.com/api/v1/graph/nodes/adr_001?graphId=$GINKO_GRAPH_ID" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated ADR Title",
    "content": "New content for this ADR",
    "status": "accepted"
  }'
```

**Response:**
```json
{
  "node": {
    "id": "adr_001",
    "label": "ADR",
    "title": "Updated ADR Title",
    "content": "New content for this ADR",
    "status": "accepted",
    "synced": false,
    "editedAt": "2025-12-15T14:30:00.000Z",
    "editedBy": "user_abc123",
    "contentHash": "a3b5c7d9...",
    "gitHash": null
  },
  "syncStatus": {
    "synced": false,
    "syncedAt": null,
    "editedAt": "2025-12-15T14:30:00.000Z",
    "editedBy": "user_abc123",
    "contentHash": "a3b5c7d9...",
    "gitHash": null
  }
}
```

### 2. GET /api/v1/graph/nodes/unsynced

List all nodes pending sync (where `synced = false`).

```bash
curl "https://app.ginkoai.com/api/v1/graph/nodes/unsynced?graphId=$GINKO_GRAPH_ID&limit=20" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
```

**Response:**
```json
{
  "nodes": [
    {
      "node": {
        "id": "adr_001",
        "title": "Updated ADR Title",
        "content": "New content for this ADR"
      },
      "syncStatus": {
        "synced": false,
        "syncedAt": null,
        "editedAt": "2025-12-15T14:30:00.000Z",
        "editedBy": "user_abc123",
        "contentHash": "a3b5c7d9...",
        "gitHash": null
      },
      "label": "ADR"
    }
  ],
  "count": 1,
  "graphId": "graph_abc123"
}
```

### 3. POST /api/v1/graph/nodes/:id/sync

Mark a node as synced (called by CLI after git commit).

```bash
curl -X POST "https://app.ginkoai.com/api/v1/graph/nodes/adr_001/sync?graphId=$GINKO_GRAPH_ID" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gitHash": "a1b2c3d4e5f6"
  }'
```

**Response:**
```json
{
  "success": true,
  "nodeId": "adr_001",
  "synced": true,
  "syncedAt": "2025-12-15T14:35:00.000Z",
  "gitHash": "a1b2c3d4e5f6"
}
```

### 4. GET /api/v1/graph/nodes/:id

Get a specific node by ID (existing endpoint, now returns sync status).

```bash
curl "https://app.ginkoai.com/api/v1/graph/nodes/adr_001?graphId=$GINKO_GRAPH_ID" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
```

**Response:**
```json
{
  "node": {
    "id": "adr_001",
    "label": "ADR",
    "title": "My ADR Title",
    "content": "ADR content...",
    "synced": true,
    "syncedAt": "2025-12-15T14:35:00.000Z",
    "editedAt": "2025-12-15T14:30:00.000Z",
    "editedBy": "user_abc123",
    "contentHash": "a3b5c7d9...",
    "gitHash": "a1b2c3d4e5f6"
  }
}
```

## Testing Workflow

1. **Create a test node** (or use existing):
   ```bash
   curl -X POST "https://app.ginkoai.com/api/v1/graph/nodes" \
     -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "graphId": "'$GINKO_GRAPH_ID'",
       "label": "ADR",
       "data": {
         "id": "adr_test_001",
         "title": "Test ADR",
         "content": "Initial content",
         "status": "proposed"
       }
     }'
   ```

2. **Update the node** (triggers `synced=false`):
   ```bash
   curl -X PATCH "https://app.ginkoai.com/api/v1/graph/nodes/adr_test_001?graphId=$GINKO_GRAPH_ID" \
     -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "Updated content", "status": "accepted"}'
   ```

3. **Check unsynced nodes**:
   ```bash
   curl "https://app.ginkoai.com/api/v1/graph/nodes/unsynced?graphId=$GINKO_GRAPH_ID" \
     -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
   ```

4. **Mark as synced** (simulate CLI sync):
   ```bash
   curl -X POST "https://app.ginkoai.com/api/v1/graph/nodes/adr_test_001/sync?graphId=$GINKO_GRAPH_ID" \
     -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"gitHash": "abc123def456"}'
   ```

5. **Verify sync status**:
   ```bash
   curl "https://app.ginkoai.com/api/v1/graph/nodes/adr_test_001?graphId=$GINKO_GRAPH_ID" \
     -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
   ```

## Error Cases

### Missing graphId
```bash
curl -X PATCH "https://app.ginkoai.com/api/v1/graph/nodes/adr_001" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}'
```

**Response (400):**
```json
{
  "error": {
    "code": "MISSING_GRAPH_ID",
    "message": "graphId query parameter is required"
  }
}
```

### Missing Authorization
```bash
curl -X PATCH "https://app.ginkoai.com/api/v1/graph/nodes/adr_001?graphId=abc123" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}'
```

**Response (401):**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required. Include Bearer token in Authorization header."
  }
}
```

### Node Not Found
```bash
curl -X PATCH "https://app.ginkoai.com/api/v1/graph/nodes/nonexistent?graphId=$GINKO_GRAPH_ID" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}'
```

**Response (404):**
```json
{
  "error": {
    "code": "NODE_NOT_FOUND",
    "message": "Node with id 'nonexistent' not found in graph 'graph_abc123'"
  }
}
```

## Sync Tracking Fields

All knowledge nodes now include these sync tracking fields (ADR-054):

| Field | Type | Description |
|-------|------|-------------|
| `synced` | boolean | Whether changes are synced to git |
| `syncedAt` | datetime | When last synced (null if never synced) |
| `editedAt` | datetime | When last edited |
| `editedBy` | string | User email who last edited |
| `contentHash` | string | SHA-256 hash of content |
| `gitHash` | string | Git commit hash when last synced |

## Integration with CLI

The CLI will use these endpoints to implement `ginko sync`:

1. Call `GET /nodes/unsynced` to get pending changes
2. For each unsynced node:
   - Write content to local file
   - Stage and commit to git
   - Call `POST /nodes/:id/sync` with git commit hash

See TASK-4 (CLI Sync-on-Demand Command) for implementation details.
