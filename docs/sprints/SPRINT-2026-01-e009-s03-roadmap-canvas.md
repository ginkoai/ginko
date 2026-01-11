# SPRINT: Product Roadmap Sprint 3 - Roadmap Canvas

## Sprint Overview

**Sprint Goal**: Build vertical priority-based canvas for editing roadmap in the dashboard
**Duration**: 2 weeks
**Type**: Feature sprint
**Progress:** 17% (1/6 tasks complete)

**Success Criteria:**
- [ ] Vertical canvas displays Epics in Now/Next/Later lanes (priority flows top-to-bottom)
- [ ] Drag-and-drop with decision factor validation (Now requires cleared factors)
- [ ] Click to edit Epic roadmap properties and decision factors
- [ ] Filter controls for status, visibility, tags
- [ ] Responsive design (works on tablet+)
- [ ] Optimistic updates with error recovery

---

## Sprint Tasks

### e009_s03_t01: Canvas Layout Component (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create vertical priority-based canvas with Now/Next/Later lanes

**Implementation Notes:**
```typescript
interface RoadmapCanvasProps {
  projectId: string;
  onEpicMove: (epicId: string, targetLane: 'now' | 'next' | 'later') => void;
  onEpicSelect: (epicId: string) => void;
}

type RoadmapLane = 'now' | 'next' | 'later';
```

**Layout (Vertical - Priority flows top to bottom):**
```
┌─────────────────────────────────────────────────────────────┐
│  ROADMAP                                    [Filters] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│  NOW  ────────────────────────────────────────────────────  │
│  Ready for immediate implementation. Fully committed.       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EPIC-009  Product Roadmap           ◐ in_progress   │    │
│  │ Sprint 3 of 4 • roadmap, dashboard                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EPIC-003  Marketing Launch          ◐ in_progress   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  NEXT  ───────────────────────────────────────────────────  │
│  Committed but may need enablers before starting.           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EPIC-010  MVP Marketing Strategy    ○ not_started   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  LATER  ──────────────────────────────────────────────────  │
│  Proposed work with unresolved decision factors.            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EPIC-011  Graph Explorer v2         ○ not_started   │    │
│  │ ⚠️ planning • architecture                          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EPIC-012  Web Collaboration GUI     ○ not_started   │    │
│  │ ⚠️ planning • design • dependencies                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Design:**
- Vertical scroll (natural direction)
- Lane headers with descriptions
- Drag up = higher priority, drag down = lower priority
- Later items show decision factor tags prominently

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` (new)
- `dashboard/src/components/roadmap/LaneSection.tsx` (new)

---

### e009_s03_t02: Epic Card Component (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Draggable Epic card with status and decision factor display

**Implementation Notes:**
```typescript
interface EpicCardProps {
  epic: Epic;
  lane: 'now' | 'next' | 'later';
  isDragging?: boolean;
  onEdit: () => void;
}
```

**Card Content:**
- Epic ID + title
- Status icon: ○ not_started, ◐ in_progress, ● completed, ✗ cancelled
- Sprint progress (if applicable): "Sprint 3 of 4"
- Tags (max 3)
- **Decision factors** (Later lane only): warning icon + factor tags
- Drag handle

**Visual States:**
- Default: white background, subtle border
- Dragging: elevated shadow, slight opacity
- In Progress: accent left border
- Completed: muted colors, checkmark overlay
- **Has decision factors**: warning badge, factor chips visible

**Decision Factor Display (Later items):**
```
┌─────────────────────────────────────────────────────────┐
│ EPIC-012  Web Collaboration GUI        ○ not_started   │
│ ⚠️ planning • design • dependencies                    │
└─────────────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/components/roadmap/EpicCard.tsx` (new)
- `dashboard/src/components/roadmap/DecisionFactorChips.tsx` (new)

---

### e009_s03_t03: Drag-and-Drop with Decision Factor Validation (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Depends:** t01, t02

**Goal:** Enable drag-and-drop between lanes with decision factor validation

**Lane Transition Rules:**

| From | To | Allowed? | Behavior |
|------|-----|----------|----------|
| Later | Next | ✅ Yes | Commits work (decision factors may remain) |
| Later | Now | ⚠️ Conditional | Only if `decision_factors` is empty |
| Next | Now | ⚠️ Conditional | Only if `decision_factors` is empty |
| Next | Later | ✅ Yes | Uncommits work, prompts for decision factors |
| Now | Next | ✅ Yes | Deprioritizes (stays committed) |
| Now | Later | ✅ Yes | Uncommits, prompts for decision factors |

**Key Rule:** Work cannot enter "Now" until all decision factors are cleared.

**Implementation Notes:**
```typescript
function canMoveTo(epic: Epic, targetLane: RoadmapLane): boolean {
  if (targetLane === 'now') {
    // Now requires all decision factors cleared
    return !epic.decision_factors || epic.decision_factors.length === 0;
  }
  return true; // All other transitions allowed
}

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const epic = getEpic(active.id as string);
  const targetLane = over.id as RoadmapLane;

  if (!canMoveTo(epic, targetLane)) {
    // Show validation error
    toast.error('Clear all decision factors before moving to Now');
    return;
  }

  // Moving to Later: prompt for decision factors if none exist
  if (targetLane === 'later' && (!epic.decision_factors || epic.decision_factors.length === 0)) {
    openDecisionFactorModal(epic, targetLane);
    return;
  }

  updateEpicLane(epic.id, targetLane);
}
```

**Visual Feedback:**
- Invalid drop target: red overlay, cursor shows "not allowed"
- Valid drop target: green highlight
- Blocked by decision factors: show tooltip explaining why

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` (update)
- `dashboard/src/hooks/useRoadmapDnd.ts` (new)
- `dashboard/src/lib/roadmap/lane-rules.ts` (new)

---

### e009_s03_t04: Epic Edit Modal with Decision Factors (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Depends:** t02

**Goal:** Modal for editing Epic roadmap properties including decision factors

**Implementation Notes:**
```typescript
interface EpicEditModalProps {
  epic: Epic;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: EpicRoadmapUpdate) => void;
}

interface EpicRoadmapUpdate {
  roadmap_lane?: 'now' | 'next' | 'later';
  roadmap_status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  decision_factors?: string[];
  roadmap_visible?: boolean;
  changelog_reason?: string;
}
```

**Fields:**
- **Lane selector**: Now / Next / Later (with validation)
- **Status**: not_started, in_progress, completed, cancelled
- **Decision factors** (multi-select chips):
  - planning, value, feasibility, advisability
  - architecture, design, risks, market-fit, dependencies
- **Visibility toggle**: Public / Internal
- **Change reason** (optional): For changelog entry
- **Tags editor**

**Validation:**
- Cannot select "Now" lane if decision factors exist
- Moving to "Later" prompts for at least one decision factor
- Shows warning if clearing factors while in Later

**Decision Factor Selector:**
```
┌─────────────────────────────────────────────────────────────┐
│ Decision Factors                                            │
│ What's blocking this work from being committed?             │
│                                                             │
│ [x] planning      [ ] feasibility    [ ] architecture       │
│ [x] design        [ ] value          [ ] risks              │
│ [ ] dependencies  [ ] market-fit     [ ] advisability       │
└─────────────────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/components/roadmap/EpicEditModal.tsx` (new)
- `dashboard/src/components/roadmap/DecisionFactorSelector.tsx` (new)

---

### e009_s03_t05: Filter Controls (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Depends:** t01

**Goal:** Filter roadmap view by lane, status, decision factors, visibility, and tags

**Implementation Notes:**
```typescript
interface RoadmapFilters {
  lanes: ('now' | 'next' | 'later')[];
  roadmap_status: ('not_started' | 'in_progress' | 'completed' | 'cancelled')[];
  decision_factors: string[];  // Filter by specific blockers
  show_internal: boolean;
  tags: string[];
}
```

**UI:**
- Lane toggles: Now / Next / Later (all on by default)
- Status chips: not_started, in_progress, completed, cancelled
- Decision factor filter: "Show items blocked by: [planning] [architecture] ..."
- Toggle for "Show internal items"
- Tag filter with autocomplete
- "Clear filters" button
- Persist filters in URL params

**Useful Filter Presets:**
- "Ready to start": Now lane only
- "Committed work": Now + Next lanes
- "Needs planning": Later lane + `planning` factor
- "Blocked": Any items with decision factors

**Files:**
- `dashboard/src/components/roadmap/RoadmapFilters.tsx` (new)
- `dashboard/src/hooks/useRoadmapFilters.ts` (new)

---

### e009_s03_t06: Optimistic Updates & Error Handling (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Depends:** t03, t04

**Goal:** Smooth UX with optimistic updates and graceful error recovery

**Implementation Notes:**
- Update UI immediately on drag/edit
- Revert on API error with toast notification
- Queue updates if rapid changes
- Handle concurrent edit conflicts (show conflict resolution)

```typescript
const { mutate, isPending, error } = useMutation({
  mutationFn: updateEpicRoadmap,
  onMutate: async (updates) => {
    // Optimistically update cache
    await queryClient.cancelQueries(['roadmap']);
    const previous = queryClient.getQueryData(['roadmap']);
    queryClient.setQueryData(['roadmap'], optimisticUpdate(updates));
    return { previous };
  },
  onError: (err, updates, context) => {
    // Rollback on error
    queryClient.setQueryData(['roadmap'], context?.previous);
    toast.error('Failed to update roadmap');
  },
});
```

**Files:**
- `dashboard/src/hooks/useRoadmapMutations.ts` (new)
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` (update)

---

## Execution Plan

**Phase 1: Core Components**
- t01: Vertical canvas layout with Now/Next/Later lanes
- t02: Epic card with decision factor display

**Phase 2: Interactions**
- t03: Drag-and-drop with lane validation rules
- t04: Edit modal with decision factor management

**Phase 3: Polish**
- t05: Filter controls
- t06: Optimistic updates and error handling
- Integration testing

---

## Accomplishments This Sprint

### 2026-01-11: T1 Canvas Layout Component

**Components Created:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` - Main canvas with vertical lane stack
  - Header with title, stats, filter toggle, show/hide done/dropped
  - Fetches from `/api/v1/graph/roadmap` API
  - Renders lanes in Now → Next → Later order
- `dashboard/src/components/roadmap/LaneSection.tsx` - Collapsible lane sections
  - Color-coded borders (green/blue/gray/green/red)
  - Lane headers with descriptions and epic counts
  - Expandable/collapsible
- `dashboard/src/components/roadmap/EpicCard.tsx` - Epic cards with status
  - Status icons: ○ not_started, ◐ in_progress, ● completed, ✗ cancelled
  - Decision factor chips for Later items (with warning icon)
  - Drag handle placeholder (for T3)
  - Tags display

**Page & Navigation:**
- `dashboard/src/app/dashboard/roadmap/page.tsx` - Roadmap page route
- Updated `dashboard/src/components/dashboard/dashboard-tabs.tsx`:
  - Added Roadmap tab with MapIcon
  - Ginko green accent color for roadmap tab

**Types Updated:**
- `dashboard/src/lib/graph/types.ts`:
  - Added `RoadmapLane` type: 'now' | 'next' | 'later' | 'done' | 'dropped'
  - Added `DecisionFactor` type for 9 factor tags
  - Updated `EpicNode` interface with `roadmap_lane`, `decision_factors`, `priority`
  - Deprecated old quarterly properties

## Next Steps

After Sprint 3:
- Sprint 4: History visualization and polish

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-009 (Product Roadmap)
**Sprint ID:** e009_s03
**Started:** 2026-01-11
**Participants:** Chris Norton, Claude
