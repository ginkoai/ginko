# Checkpoint API

**Version:** v1
**Base URL:** `/api/v1/checkpoint`
**Authentication:** Bearer token required

## Overview

The Checkpoint API enables multi-agent orchestration by tracking agent work snapshots with git commits, modified files, and event cursors. This allows orchestrators to resume work, handoff tasks between agents, and maintain context across agent lifecycle events.

## Endpoints

### POST /api/v1/checkpoint

Create a new checkpoint for agent work.

**Authentication:** Required (Bearer token)

**Request Body:**

```typescript
{
  graphId: string;        // Graph ID (required)
  taskId: string;         // Task ID, e.g., "TASK-1" (required)
  agentId: string;        // Agent ID (required)
  gitCommit: string;      // Git commit hash (required)
  filesModified: string[]; // Array of file paths (required)
  eventsSince: string;    // Event ID cursor (required)
  message?: string;       // Optional checkpoint message
  metadata?: Record<string, any>; // Optional metadata
}
```

**Response:** `201 Created`

```typescript
{
  checkpoint: {
    id: string;              // Generated checkpoint ID
    taskId: string;
    agentId: string;
    timestamp: string;       // ISO 8601 timestamp
    gitCommit: string;
    filesModified: string[];
    eventsSince: string;
    message?: string;
    metadata: Record<string, any>;
  }
}
```

**Example:**

```bash
curl -X POST https://app.ginkoai.com/api/v1/checkpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "graph_abc123",
    "taskId": "TASK-1",
    "agentId": "agent_1733598000_abc123",
    "gitCommit": "a1b2c3d4e5f6",
    "filesModified": [
      "src/components/Dashboard.tsx",
      "src/lib/api-client.ts"
    ],
    "eventsSince": "event_1733598000_xyz789",
    "message": "Completed dashboard UI implementation",
    "metadata": {
      "branch": "feature/dashboard",
      "linesAdded": 250,
      "linesDeleted": 30
    }
  }'
```

---

### GET /api/v1/checkpoint

List checkpoints with optional filtering.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `graphId` | string | **Yes** | Graph ID to filter by |
| `taskId` | string | No | Filter by task ID |
| `agentId` | string | No | Filter by agent ID |
| `limit` | number | No | Max results (default: 20, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response:** `200 OK`

```typescript
{
  checkpoints: Checkpoint[];
  total: number;
  limit: number;
  offset: number;
}
```

**Example:**

```bash
# List all checkpoints for a graph
curl -X GET "https://app.ginkoai.com/api/v1/checkpoint?graphId=graph_abc123&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by task
curl -X GET "https://app.ginkoai.com/api/v1/checkpoint?graphId=graph_abc123&taskId=TASK-1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by agent
curl -X GET "https://app.ginkoai.com/api/v1/checkpoint?graphId=graph_abc123&agentId=agent_1733598000_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Responses

### 401 Unauthorized

Missing or invalid authorization header.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required. Include Bearer token in Authorization header."
  }
}
```

### 400 Bad Request

Missing required fields or invalid parameters.

```json
{
  "error": {
    "code": "MISSING_FIELD",
    "message": "taskId is required and must be a non-empty string"
  }
}
```

```json
{
  "error": {
    "code": "MISSING_GRAPH_ID",
    "message": "graphId is required"
  }
}
```

```json
{
  "error": {
    "code": "INVALID_FILES",
    "message": "filesModified is required and must be an array"
  }
}
```

### 503 Service Unavailable

Graph database is unavailable.

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Graph database is unavailable. Please try again later."
  }
}
```

### 500 Internal Server Error

Unexpected server error.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create checkpoint"
  }
}
```

---

## Data Model

### Checkpoint Node (Neo4j)

Stored as `Checkpoint` nodes in the graph database with the following properties:

```cypher
(:Checkpoint {
  id: string,                    // Unique checkpoint ID
  graph_id: string,              // Graph ID
  task_id: string,               // Task ID
  agent_id: string,              // Agent ID
  timestamp: datetime,           // Creation timestamp
  git_commit: string,            // Git commit hash
  files_modified: [string],      // Array of file paths
  events_since: string,          // Event cursor ID
  message: string | null,        // Optional message
  metadata: map,                 // Additional metadata
  organization_id: string,       // Organization ID (from token)
  created_at: datetime           // Node creation time
})
```

### Checkpoint ID Format

`checkpoint_{timestamp}_{random6}`

- `timestamp`: Unix timestamp in milliseconds
- `random6`: 6-character random alphanumeric string

**Example:** `checkpoint_1733598000123_abc123`

---

## Use Cases

### 1. Agent Respawn After Failure

When an agent crashes, the orchestrator can retrieve the last checkpoint to resume work:

```bash
# Get latest checkpoint for task
curl -X GET "https://app.ginkoai.com/api/v1/checkpoint?graphId=graph_123&taskId=TASK-1&limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The orchestrator then:
1. Checks out the `gitCommit`
2. Loads context from `eventsSince` cursor
3. Reviews `filesModified` to understand scope
4. Spawns new agent with restored context

### 2. Task Handoff Between Agents

When handing off a task to a different agent:

```bash
# Create checkpoint before handoff
curl -X POST https://app.ginkoai.com/api/v1/checkpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "graph_123",
    "taskId": "TASK-1",
    "agentId": "agent_worker_1",
    "gitCommit": "current_commit_hash",
    "filesModified": ["src/feature.ts"],
    "eventsSince": "event_cursor_id",
    "message": "Handoff to specialist agent for optimization"
  }'
```

### 3. Progress Tracking

Track incremental progress as agents complete subtasks:

```bash
# List all checkpoints for task to see progress
curl -X GET "https://app.ginkoai.com/api/v1/checkpoint?graphId=graph_123&taskId=TASK-1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Integration Patterns

### CLI Integration

```typescript
// Create checkpoint in ginko orchestrate command
import { createCheckpoint } from '@/lib/checkpoint-client';

async function saveCheckpoint(task: Task, agent: Agent) {
  const checkpoint = await createCheckpoint({
    graphId: process.env.GINKO_GRAPH_ID!,
    taskId: task.id,
    agentId: agent.id,
    gitCommit: await getCurrentCommit(),
    filesModified: await getModifiedFiles(),
    eventsSince: await getCurrentEventCursor(),
    message: `Progress checkpoint for ${task.title}`,
    metadata: {
      contextPressure: agent.contextPressure,
      tokensUsed: agent.tokensUsed,
    },
  });

  return checkpoint;
}
```

### Orchestrator Lifecycle

```typescript
// Resume from checkpoint after agent failure
async function resumeFromCheckpoint(taskId: string) {
  const checkpoints = await listCheckpoints({
    graphId: process.env.GINKO_GRAPH_ID!,
    taskId,
    limit: 1, // Get latest
  });

  if (checkpoints.length === 0) {
    throw new Error('No checkpoint found for task');
  }

  const latest = checkpoints[0];

  // Restore git state
  await execAsync(`git checkout ${latest.gitCommit}`);

  // Load context from event cursor
  const context = await loadContextFromCursor(latest.eventsSince);

  // Spawn new agent with restored state
  const agent = await spawnAgent({
    taskId,
    context,
    filesModified: latest.filesModified,
  });

  return agent;
}
```

---

## Testing

Run the included test script:

```bash
cd dashboard
./test-checkpoint-api.sh
```

The script tests:
- ✅ Creating checkpoints
- ✅ Listing checkpoints by graphId
- ✅ Filtering by taskId
- ✅ Authorization validation
- ✅ Field validation
- ✅ GraphId requirement

---

## Related APIs

- [Agent API](/api/v1/agent) - Register and manage agents
- [Events API](/api/v1/events) - Query event stream for context
- [Graph API](/api/v1/graph) - Query knowledge graph

---

## Implementation Details

- **Database:** Neo4j AuraDB (serverless)
- **Connection:** Singleton driver pattern for serverless compatibility
- **Session Management:** Auto-close sessions after queries
- **Error Handling:** Structured error responses with codes
- **Authorization:** Organization ID extracted from Bearer token
- **ID Generation:** Timestamp + random suffix for uniqueness

**Related Files:**
- Implementation: `dashboard/src/app/api/v1/checkpoint/route.ts`
- Neo4j utilities: `dashboard/src/app/api/v1/graph/_neo4j.ts`
- Test script: `dashboard/test-checkpoint-api.sh`

---

**Last Updated:** 2025-12-07
**EPIC:** EPIC-004 (Multi-Agent Orchestration)
**Related ADRs:** ADR-043 (Event-Based Context Loading)
