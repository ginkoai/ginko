---
type: pattern
tags: [feature, high]
relevance: critical
created: 2026-01-21T18:06:36.674Z
updated: 2026-01-21T18:06:36.674Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769018796629
insightId: acf7e9aa-80f6-4932-bf0d-9df233b29db5
---

# Deployed query endpoint fix: now searches type-specific v...

**Type**: pattern  
**Tags**: feature, high  
**Created**: 2026-01-21  

## Pattern Description

Deployed query endpoint fix: now searches type-specific vector indexes instead of non-existent knowledge_embeddings

## Implementation

migration 014 for Voyage AI 1024-dim indexes (Sprint, Epic, Task, Charter)

## Code Example

*No code example available*

## When to Use

Deployed query endpoint fix: now searches type-specific vector indexes instead of non-existent knowledge_embeddings. Created migration 014 for Voyage AI 1024-dim indexes (Sprint, Epic, Task, Charter). Migration pending - needs to be run via Neo4j AuraDB console.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `dashboard/src/app/api/v1/graph/query/route.ts`
- `src/graph/schema/014-voyage-vector-indexes.cypher`