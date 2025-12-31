---
type: gotcha
tags: [fix, high, api, cli]
relevance: critical
created: 2025-12-31T23:32:08.846Z
updated: 2025-12-31T23:32:08.846Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1767223928767
insightId: dbf72c35-a1bc-4e58-93e6-1500ede5cf72
---

# Fixed ginko sync command: (1) API response transformation...

**Type**: gotcha  
**Tags**: fix, high, api, cli  
**Created**: 2025-12-31  
**Session**: session-chris-at-watchhill-ai-1767223928767  

## The Gotcha

ginko sync command: (1) API response transformation - the /api/v1/graph/nodes/unsynced endpoint returns nested structure {node:{id,label,properties}, syncStatus:{

## The Solution

transformApiNode() in sync-command

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed ginko sync command: (1) API response transformation - the /api/v1/graph/nodes/unsynced endpoint returns nested structure {node:{id,label,properties}, syncStatus:{...}} but CLI expected flat UnsyncedNode. Added transformApiNode() in sync-command.ts:73-90. (2) --dry-run flag shadowing - global --dry-run on magic command catch-all was capturing flag before subcommands. Removed from index.ts:607. Both fixes verified working.

## Related Files

- `packages/cli/src/commands/sync/sync-command.ts`
- `packages/cli/src/commands/sync/node-syncer.ts`
- `packages/cli/src/index.ts`

---
*This context module was automatically generated from session insights.*