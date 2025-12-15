---
type: gotcha
tags: [fix, high, cli]
relevance: critical
created: 2025-12-15T18:07:07.438Z
updated: 2025-12-15T18:07:07.438Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765822027417
insightId: 3e62558a-63dd-4e52-b6e0-bb2c76453475
---

# Fixed insights data collector to use findGinkoRoot instea...

**Type**: gotcha  
**Tags**: fix, high, cli  
**Created**: 2025-12-15  
**Session**: session-chris-at-watchhill-ai-1765822027417  

## The Gotcha

insights data collector to use findGinkoRoot instead of process

## The Solution

Fixed insights data collector to use findGinkoRoot instead of process.cwd(). Now properly traverses up to monorepo root to find .ginko folder. Removed spurious empty .ginko folder from packages/cli that was masking the issue.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed insights data collector to use findGinkoRoot instead of process.cwd(). Now properly traverses up to monorepo root to find .ginko folder. Removed spurious empty .ginko folder from packages/cli that was masking the issue.

## Related Files

- `packages/cli/src/lib/insights/data-collector.ts`

---
*This context module was automatically generated from session insights.*