---
type: pattern
tags: [database, serverless, connection-pool, production, singleton]
relevance: medium
created: 2025-09-09T18:50:35.201Z
updated: 2025-09-09T18:50:35.201Z
dependencies: []
sessionId: xtophr@gmail.com-1757443835189
insightId: 858831b4-5595-4813-a56a-c4d81c064c78
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