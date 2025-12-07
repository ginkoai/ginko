# Verification Result Storage

**EPIC-004 Sprint 3 TASK-7**

Graph storage system for verification results in Neo4j. Enables audit trail of task verification attempts, analytics on verification patterns, and multi-agent quality tracking.

## Overview

This module provides utilities for storing and querying verification results in the Neo4j knowledge graph. Each verification creates a `VerificationResult` node linked to its task via a `VERIFIED_BY` relationship.

## Key Features

- **Audit trail**: Track all verification attempts per task
- **Agent attribution**: Link verifications to agents who performed them
- **Queryable history**: Retrieve verification history by task, agent, or time
- **Analytics ready**: Aggregate statistics for dashboards and reporting

## Graph Schema

```cypher
// VerificationResult node
CREATE (v:VerificationResult {
  id: 'ver_TASK-1_1701345678000',
  task_id: 'TASK-1',
  passed: true,
  timestamp: datetime(),
  criteria_passed: 3,
  criteria_total: 4,
  agent_id: 'agent-123',
  summary: 'PASSED (3/4 criteria passed)',
  criteria_details: '[...]' // JSON string
})

// Relationships
(Task)-[:VERIFIED_BY]->(VerificationResult)
(Agent)-[:PERFORMED]->(VerificationResult)
```

## API Usage

### Store Verification Result

```typescript
import { storeVerificationResult } from '@/lib/verification-storage';

const result = {
  taskId: 'TASK-42',
  taskTitle: 'Implement user authentication',
  passed: true,
  timestamp: new Date(),
  criteria: [
    {
      id: 'test',
      description: 'Unit tests pass',
      passed: true,
      details: '142 passed, 0 failed',
      duration_ms: 3500,
    },
    {
      id: 'build',
      description: 'Build succeeds',
      passed: true,
      details: '12.3s',
      duration_ms: 12300,
    },
  ],
  summary: 'PASSED (2/2 criteria passed)',
};

// Store with agent ID
const verificationId = await storeVerificationResult(result, 'agent-123');
// Returns: 'ver_TASK-42_1701345678000'

// Store without agent ID
const verificationId = await storeVerificationResult(result);
```

### Get Verification History

```typescript
import { getVerificationHistory } from '@/lib/verification-storage';

// Get last 10 verifications for a task
const history = await getVerificationHistory('TASK-42', 10);

// Returns array of StoredVerificationResult:
// [
//   {
//     id: 'ver_TASK-42_1701345678000',
//     task_id: 'TASK-42',
//     passed: true,
//     timestamp: '2025-12-05T10:00:00Z',
//     criteria_passed: 2,
//     criteria_total: 2,
//     agent_id: 'agent-123',
//     summary: 'PASSED (2/2 criteria passed)',
//     criteria_details: [...]
//   },
//   ...
// ]
```

### Get Recent Verifications

```typescript
import { getRecentVerifications } from '@/lib/verification-storage';

// Get 20 most recent verifications across all tasks
const recent = await getRecentVerifications(20);

// Filter by agent
const agentVerifications = await getRecentVerifications(20, 'agent-123');

// Filter by pass status
const onlyPassed = await getRecentVerifications(20, undefined, true);
const onlyFailed = await getRecentVerifications(20, undefined, false);

// Combine filters
const agentFailures = await getRecentVerifications(20, 'agent-123', false);
```

### Get Verification Statistics

```typescript
import { getVerificationStats } from '@/lib/verification-storage';

const stats = await getVerificationStats('TASK-42');

// Returns:
// {
//   total_attempts: 5,
//   passed_attempts: 3,
//   failed_attempts: 2,
//   last_attempt_passed: true,
//   last_attempt_timestamp: '2025-12-05T10:00:00Z'
// }
```

## REST API Endpoints

### POST /api/v1/task/verify

Store a verification result.

**Request:**
```json
{
  "taskId": "TASK-42",
  "taskTitle": "Implement user authentication",
  "passed": true,
  "timestamp": "2025-12-05T10:00:00Z",
  "criteria": [
    {
      "id": "test",
      "description": "Unit tests pass",
      "passed": true,
      "details": "142 passed, 0 failed",
      "duration_ms": 3500
    }
  ],
  "summary": "PASSED (1/1 criteria passed)",
  "agentId": "agent-123"
}
```

**Response:**
```json
{
  "success": true,
  "verificationId": "ver_TASK-42_1701345678000",
  "stored": {
    "taskId": "TASK-42",
    "passed": true,
    "timestamp": "2025-12-05T10:00:00Z",
    "criteriaPassed": 1,
    "criteriaTotal": 1
  }
}
```

### GET /api/v1/task/verify

Query verification data.

**Get task history:**
```
GET /api/v1/task/verify?taskId=TASK-42&limit=10
```

**Get task statistics:**
```
GET /api/v1/task/verify?taskId=TASK-42&stats=true
```

**Get recent verifications:**
```
GET /api/v1/task/verify?limit=20
GET /api/v1/task/verify?limit=20&agentId=agent-123
GET /api/v1/task/verify?limit=20&passedOnly=true
```

## Integration with CLI

The `ginko verify` command can optionally push results to the API:

```bash
# Run verification (local only)
ginko verify TASK-42

# Run verification and store in graph
ginko verify TASK-42 --store

# Run verification with agent ID
ginko verify TASK-42 --store --agent-id=agent-123
```

## Example: Multi-Agent Workflow

```typescript
// Agent 1 attempts verification
const result1 = await storeVerificationResult({
  taskId: 'TASK-42',
  passed: false,
  criteria: [...],
  summary: 'FAILED (2/3 criteria passed)',
}, 'agent-001');

// Agent 2 fixes issues and re-verifies
const result2 = await storeVerificationResult({
  taskId: 'TASK-42',
  passed: true,
  criteria: [...],
  summary: 'PASSED (3/3 criteria passed)',
}, 'agent-002');

// Get history shows both attempts
const history = await getVerificationHistory('TASK-42');
// [agent-002 passed, agent-001 failed]

// Get stats shows progress
const stats = await getVerificationStats('TASK-42');
// { total: 2, passed: 1, failed: 1, last_passed: true }
```

## Data Retention

Verification results are stored indefinitely for audit purposes. To query older results:

```typescript
// Get all verifications (no limit)
const allHistory = await getVerificationHistory('TASK-42', 1000);

// Filter by date in application code
const lastWeek = allHistory.filter(v => {
  const timestamp = new Date(v.timestamp);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return timestamp > weekAgo;
});
```

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const verificationId = await storeVerificationResult(result);
} catch (error) {
  if (error.message.includes('Neo4j connection failed')) {
    // Handle database connectivity issues
  }
  // Other error handling
}
```

## Testing

See `dashboard/src/lib/__tests__/verification-storage.test.ts` for comprehensive test examples.

Run tests:
```bash
npm test verification-storage
```

## Related Files

- `dashboard/src/lib/verification-storage.ts` - Main utility functions
- `dashboard/src/app/api/v1/task/verify/route.ts` - REST API endpoints
- `packages/cli/src/commands/verify.ts` - CLI integration
- `dashboard/src/app/api/v1/graph/_neo4j.ts` - Neo4j connection utilities

## Architecture Decisions

- **ADR-002**: AI-Optimized File Discovery (frontmatter)
- **ADR-043**: Event-Based Context Loading
- **ADR-051**: Verification & Quality Framework (EPIC-004 Sprint 3)
