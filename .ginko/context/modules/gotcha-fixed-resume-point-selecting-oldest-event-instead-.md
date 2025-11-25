---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-11-24T23:08:13.358Z
updated: 2025-11-24T23:08:13.358Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1764025693343
insightId: 04b41101-137e-486b-be29-d646c88f58ec
---

# Fixed resume point selecting oldest event instead of most...

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-11-24  
**Session**: session-chris-at-watchhill-ai-1764025693343  

## The Gotcha

synthesis.ts:277 used timeline[timeline.length-1] assuming oldest-first order, but API returns newest-first (ORDER BY timestamp DESC). Solution: (1) Changed to timeline[0] for newest event, (2) Added filter for test events ([TEST*, 'test event'), (3) Added minimum description length filter (>20 chars). Resume point now correctly shows most recent meaningful achievement.

## The Solution

(1) Changed to timeline[0] for newest event, (2) Added filter for test events ([TEST*, 'test event'), (3) Added minimum description length filter (>20 chars). Resume point now correctly shows most recent meaningful achievement.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed resume point selecting oldest event instead of most recent. Root cause: synthesis.ts:277 used timeline[timeline.length-1] assuming oldest-first order, but API returns newest-first (ORDER BY timestamp DESC). Solution: (1) Changed to timeline[0] for newest event, (2) Added filter for test events ([TEST*, 'test event'), (3) Added minimum description length filter (>20 chars). Resume point now correctly shows most recent meaningful achievement.

## Related Files

- `packages/cli/src/utils/synthesis.ts:280-290`

---
*This context module was automatically generated from session insights.*