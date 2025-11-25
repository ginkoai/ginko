---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2025-11-24T23:18:23.573Z
updated: 2025-11-24T23:18:23.573Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1764026303560
insightId: ff9e7c05-898a-4494-ae46-e40362cb8ddd
---

# Fixed two display bugs in ginko start: (1) 'last 0 days' ...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2025-11-24  
**Session**: session-chris-at-watchhill-ai-1764026303560  

## The Gotcha

two display bugs in ginko start: (1) 'last 0 days' showed 0 because it calculated from newest event instead of oldest - fixed by using timeline[length-1] for day span calculation in context-loader-events

## The Solution

using timeline[length-1] for day span calculation in context-loader-events

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed two display bugs in ginko start: (1) 'last 0 days' showed 0 because it calculated from newest event instead of oldest - fixed by using timeline[length-1] for day span calculation in context-loader-events.ts:963. (2) 'Active Sprint (0%)' showed phantom sprint when between sprints - fixed by checking CURRENT-SPRINT.md first in sprint-loader.ts:99-123. Now correctly returns null when status is 'Between Sprints' or 'No active sprint'. Output now shows accurate 'last 6 days' and omits sprint section when between sprints.

## Related Files

- `packages/cli/src/lib/context-loader-events.ts:958-967`
- `packages/cli/src/lib/sprint-loader.ts:79-161`

---
*This context module was automatically generated from session insights.*