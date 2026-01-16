---
type: pattern
tags: [feature, high, cli]
relevance: critical
created: 2026-01-16T16:07:06.680Z
updated: 2026-01-16T16:07:06.680Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768579626615
insightId: 2042a999-b84e-4d3c-8c02-f7a235e7a2ea
---

# Implemented ancestry-based breadcrumbs (t05 fix)

**Type**: pattern  
**Tags**: feature, high, cli  
**Created**: 2026-01-16  

## Pattern Description

Implemented ancestry-based breadcrumbs (t05 fix)

## Implementation

ancestry-based breadcrumbs (t05 fix)

## Code Example

*No code example available*

## When to Use

Implemented ancestry-based breadcrumbs (t05 fix). Added useNodeAncestry hook to fetch full parent chain (Task→Sprint→Epic). Breadcrumbs now show complete hierarchy when clicking any node in tree. Replaced manual navigation history tracking with automatic ancestry fetching.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `dashboard/src/lib/graph/hooks.ts`
- `dashboard/src/app/dashboard/graph/page.tsx`