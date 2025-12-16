---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2025-12-16T20:56:27.944Z
updated: 2025-12-16T20:56:27.944Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1765918587916
insightId: 39d64f61-65b9-40d1-b48b-b3a60d582a01
---

# Fixed task assignment sync to graph

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2025-12-16  
**Session**: session-chris-at-watchhill-ai-1765918587916  

## The Gotcha

Sprint sync was storing 'owner' field but dashboard expected 'assignee'. Fixed by: (1) extracting email from **Owner:** or **Assignee:** markdown format, (2) adding 'assignee' property to task sync, (3) fixing graph init to use proper userId from token, (4) adding user access to existing graph, (5) setting graphId property on tasks for API filtering. Verified e006 tasks now have assignee=chris@watchhill.ai in Neo4j.

## The Solution

Fixed task assignment sync to graph. Root cause: Sprint sync was storing 'owner' field but dashboard expected 'assignee'. Fixed by: (1) extracting email from **Owner:** or **Assignee:** markdown format, (2) adding 'assignee' property to task sync, (3) fixing graph init to use proper userId from token, (4) adding user access to existing graph, (5) setting graphId property on tasks for API filtering. Verified e006 tasks now have assignee=chris@watchhill.ai in Neo4j.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed task assignment sync to graph. Root cause: Sprint sync was storing 'owner' field but dashboard expected 'assignee'. Fixed by: (1) extracting email from **Owner:** or **Assignee:** markdown format, (2) adding 'assignee' property to task sync, (3) fixing graph init to use proper userId from token, (4) adding user access to existing graph, (5) setting graphId property on tasks for API filtering. Verified e006 tasks now have assignee=chris@watchhill.ai in Neo4j.

## Related Files

- `.ginko/graph/config.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/graph/init/route.ts`

---
*This context module was automatically generated from session insights.*