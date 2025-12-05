# Quality Override API

## Purpose
Allows human users to override failed verification and mark tasks complete despite failing acceptance criteria. This is a quality exception mechanism for cases where automated verification fails but the work is acceptable.

## Endpoint
```
POST /api/v1/task/:id/override
```

## Authorization
- **Human users only**: Only User nodes (not Agent nodes) can override
- **Bearer token required**: Include in `Authorization` header

## Request Body
```typescript
{
  reason: string;    // Required: Explanation for override
  graphId: string;   // Required: Graph ID for logging
}
```

## Response

### Success (200)
```typescript
{
  taskId: string;
  overridden: boolean;      // Always true on success
  overriddenBy: string;     // User ID who performed override
  reason: string;           // Override reason
  timestamp: string;        // ISO 8601 timestamp
}
```

### Error Responses

**401 Unauthorized**
```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required. Include Bearer token in Authorization header."
  }
}
```

**403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Only human users can override verification. Agents cannot override quality checks."
  }
}
```

**400 Bad Request**
```json
{
  "error": {
    "code": "MISSING_REASON",
    "message": "Override reason is required and must be a non-empty string"
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found or access denied"
  }
}
```

## Usage Example

### Using curl
```bash
curl -X POST https://app.ginkoai.com/api/v1/task/TASK-1/override \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Tests fail due to known infrastructure issue. Code reviewed and approved.",
    "graphId": "graph_abc123"
  }'
```

### Using JavaScript
```typescript
async function overrideTaskVerification(
  taskId: string,
  reason: string,
  graphId: string,
  bearerToken: string
): Promise<OverrideResult> {
  const response = await fetch(
    `https://app.ginkoai.com/api/v1/task/${taskId}/override`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, graphId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

// Usage
try {
  const result = await overrideTaskVerification(
    'TASK-1',
    'Tests fail due to known infrastructure issue. Code reviewed and approved.',
    'graph_abc123',
    process.env.GINKO_BEARER_TOKEN
  );
  console.log('Override successful:', result);
} catch (error) {
  console.error('Override failed:', error.message);
}
```

## Graph Schema

### Nodes Created
```cypher
(:QualityOverride {
  id: 'override_<timestamp>',
  task_id: 'TASK-X',
  user_id: 'user_xxx',
  reason: 'Override reason text',
  timestamp: datetime(),
  graph_id: 'graph_xxx'
})
```

### Relationships Created
```cypher
(Task)-[:OVERRIDDEN_BY]->(QualityOverride)
(User)-[:PERFORMED_OVERRIDE]->(QualityOverride)
```

### Task Updates
When override is successful, the task is updated:
```cypher
SET t.status = 'complete',
    t.completed_at = datetime(),
    t.updated_at = datetime(),
    t.quality_override = true
```

## Use Cases

1. **Infrastructure Issues**: Tests fail due to temporary infrastructure problems
2. **False Positives**: Automated checks incorrectly flag valid code
3. **Acceptable Exceptions**: Work meets requirements but fails automated criteria
4. **Time-Sensitive Delivery**: Critical deployment needs to proceed despite minor test failures

## Best Practices

1. **Be Specific**: Provide detailed reason explaining why override is necessary
2. **Document Root Cause**: Include what caused the verification failure
3. **Track Patterns**: If overrides are frequent, review and improve verification criteria
4. **Audit Trail**: All overrides are logged in the graph for accountability

## Security

- Agents **cannot** override their own verification failures
- Only human users with valid authentication can override
- All overrides are logged with user ID, timestamp, and reason
- Overrides are permanent and cannot be undone (audit trail)

## Related Endpoints

- `POST /api/v1/task/:id/verify` - Run verification checks
- `POST /api/v1/task/:id/claim` - Claim a task
- `POST /api/v1/task/:id/release` - Release a task
