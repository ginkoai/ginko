---
type: gotcha
tags: [fix, high]
relevance: critical
created: 2026-01-12T14:50:14.388Z
updated: 2026-01-12T14:50:14.388Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768229414272
insightId: 719e7deb-1a4f-40a4-801f-9906dbdba460
---

# Fixed card duplication bug (e009_s05_t01): Removed CSS tr...

**Type**: gotcha  
**Tags**: fix, high  
**Created**: 2026-01-12  
**Session**: session-chris-at-watchhill-ai-1768229414272  

## The Gotcha

card duplication bug (e009_s05_t01): Removed CSS transform from DraggableEpicCard - the original card now stays in place as a placeholder (50% opacity) while DragOverlay handles visual drag feedback

## The Solution

Fixed card duplication bug (e009_s05_t01): Removed CSS transform from DraggableEpicCard - the original card now stays in place as a placeholder (50% opacity) while DragOverlay handles visual drag feedback. Previously both transform AND DragOverlay were moving cards, causing duplication. Also fixed desktop width (e009_s05_t02): Changed max-w-4xl to max-w-7xl with larger padding on lg screens.

## Code Example

*No code example available*

## How to Avoid

N/A

## Impact

- **Time Saved**: 60 minutes
- **Reusability**: 85%
- Fixed card duplication bug (e009_s05_t01): Removed CSS transform from DraggableEpicCard - the original card now stays in place as a placeholder (50% opacity) while DragOverlay handles visual drag feedback. Previously both transform AND DragOverlay were moving cards, causing duplication. Also fixed desktop width (e009_s05_t02): Changed max-w-4xl to max-w-7xl with larger padding on lg screens.

## Related Files

- `dashboard/src/components/roadmap/EpicCard.tsx:167`
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx:479`

---
*This context module was automatically generated from session insights.*