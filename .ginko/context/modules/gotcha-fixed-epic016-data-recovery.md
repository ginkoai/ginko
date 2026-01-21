---
type: gotcha
tags: [fix, high, api]
relevance: critical
created: 2026-01-20T23:20:04.159Z
updated: 2026-01-20T23:20:04.159Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768951204098
insightId: 432ee978-a5c5-48ed-ba65-d0481d12342b
---

# Fixed EPIC-016 data recovery

**Type**: gotcha  
**Tags**: fix, high, api  
**Created**: 2026-01-20  
**Session**: session-chris-at-watchhill-ai-1768951204098  

## The Gotcha

Two duplicate nodes with different IDs (EPIC-016 from dashboard, EPIC-016-personal-workstreams from file load). Solution: (1) Updated EPIC-016 with full content from local file via API PATCH, (2) Deleted duplicate EPIC-016-personal-workstreams node, (3) Added summary field extracted from vision section. The explore API expects node.summary but upload only stores node.content.

## The Solution

(1) Updated EPIC-016 with full content from local file via API PATCH, (2) Deleted duplicate EPIC-016-personal-workstreams node, (3) Added summary field extracted from vision section. The explore API expects node.summary but upload only stores node.content.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed EPIC-016 data recovery. Root cause: Two duplicate nodes with different IDs (EPIC-016 from dashboard, EPIC-016-personal-workstreams from file load). Solution: (1) Updated EPIC-016 with full content from local file via API PATCH, (2) Deleted duplicate EPIC-016-personal-workstreams node, (3) Added summary field extracted from vision section. The explore API expects node.summary but upload only stores node.content.

## Related Files

- `.ginko/graph/config.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`

---
*This context module was automatically generated from session insights.*