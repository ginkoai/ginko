---
type: pattern
status: draft
updated: 2026-01-16
synced-from: dashboard
synced-at: 2026-01-16T21:22:46.631Z
---

# Use connection pooling for serverless database access

---
type: pattern
tags: [database, serverless, connection-pool, production, singleton]
relevance: medium
created: 2025-09-09T21:49:04.763Z
updated: 2025-09-09T21:49:04.763Z
dependencies: []
sessionId: xtophr@gmail.com-1757454544754
insightId: 8fb82938-0d8a-4d30-b5c1-cc5f5ab1e74d
---

# Use connection pooling for serverless database access

**Type**: pattern  
**Tags**: database, serverless, connection-pool, production, singleton  
**Created**: 2025-09-09  

## Pattern Description

Database connections exhausted in production with serverless functions

## Implementation

Implemented singleton pattern for database connection pool, reusing connections across function invocations

## Code Example

### Before
```typescript
const db = new DatabaseClient(config);
```

### After
```typescript
let db: DatabaseClient;
if (!db) { db = new DatabaseClient(config); }
```


## When to Use

Prevents production database connection failures

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

*No specific files*