# SPRINT: Product Roadmap Sprint 3 - Roadmap Canvas

## Sprint Overview

**Sprint Goal**: Build visual canvas for editing roadmap in the dashboard
**Duration**: 2 weeks (2026-01-20 to 2026-01-31)
**Type**: Feature sprint
**Progress:** 0% (0/6 tasks complete)

**Success Criteria:**
- [ ] Visual canvas displays Epics organized by quarter
- [ ] Drag-and-drop to move Epics between quarters
- [ ] Click to edit Epic roadmap properties
- [ ] Filter controls for status, visibility, tags
- [ ] Responsive design (works on tablet+)
- [ ] Optimistic updates with error recovery

---

## Sprint Tasks

### e009_s03_t01: Canvas Layout Component (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create the base canvas layout with quarter columns

**Implementation Notes:**
```typescript
interface RoadmapCanvasProps {
  projectId: string;
  quarters: string[];  // ["Q1-2026", "Q2-2026", ...]
  onEpicMove: (epicId: string, targetQuarter: string) => void;
  onEpicSelect: (epicId: string) => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Roadmap                                    [Filters] [Export]│
├────────────┬────────────┬────────────┬────────────┬─────────┤
│  Q1-2026   │  Q2-2026   │  Q3-2026   │  Q4-2026   │ Backlog │
├────────────┼────────────┼────────────┼────────────┼─────────┤
│ ┌────────┐ │            │            │            │ ┌─────┐ │
│ │Epic A  │ │ ┌────────┐ │            │            │ │Idea │ │
│ │████████│ │ │Epic B  │ │            │            │ └─────┘ │
│ └────────┘ │ │░░░░░░░░│ │            │            │ ┌─────┐ │
│            │ └────────┘ │            │            │ │Idea │ │
│            │            │            │            │ └─────┘ │
└────────────┴────────────┴────────────┴────────────┴─────────┘
(████ = committed, ░░░░ = in_progress)
```

- Horizontal scroll for quarters
- Backlog column for uncommitted items
- Responsive breakpoints

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` (new)
- `dashboard/src/components/roadmap/QuarterColumn.tsx` (new)

---

### e009_s03_t02: Epic Card Component (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Draggable Epic card with status indicators

**Implementation Notes:**
```typescript
interface EpicCardProps {
  epic: Epic;
  isDragging?: boolean;
  onEdit: () => void;
}
```

**Card Content:**
- Epic title (truncated)
- Status badge (committed/uncommitted)
- Progress indicator (if sprints exist)
- Tag chips (max 3)
- Drag handle

**Visual States:**
- Default: white background
- Dragging: elevated shadow, slight opacity
- Committed: solid left border (green)
- In Progress: animated left border
- Completed: muted colors, checkmark

**Files:**
- `dashboard/src/components/roadmap/EpicCard.tsx` (new)
- `dashboard/src/components/roadmap/EpicCard.css` (new)

---

### e009_s03_t03: Drag-and-Drop Implementation (6h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Depends:** t01, t02

**Goal:** Enable drag-and-drop to move Epics between quarters

**Implementation Notes:**
- Use `@dnd-kit/core` for accessible drag-and-drop
- Handle drop zones per quarter column
- Moving to Backlog sets commitment_status='uncommitted' and clears dates
- Moving from Backlog to quarter sets commitment_status='committed' and target_start_quarter

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;

  const epicId = active.id as string;
  const targetQuarter = over.id as string;

  if (targetQuarter === 'backlog') {
    updateEpic(epicId, {
      commitment_status: 'uncommitted',
      target_start_quarter: null,
      target_end_quarter: null
    });
  } else {
    updateEpic(epicId, {
      commitment_status: 'committed',
      target_start_quarter: targetQuarter
    });
  }
}
```

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` (update)
- `dashboard/src/hooks/useRoadmapDnd.ts` (new)

---

### e009_s03_t04: Epic Edit Modal (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Depends:** t02

**Goal:** Modal for editing Epic roadmap properties

**Implementation Notes:**
```typescript
interface EpicEditModalProps {
  epic: Epic;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: EpicRoadmapUpdate) => void;
}
```

**Fields:**
- Commitment status toggle
- Start quarter dropdown
- End quarter dropdown
- Roadmap visibility toggle
- Change reason (optional, for changelog)
- Tags editor

**Validation:**
- Disable date fields when uncommitted
- Warn if end quarter > 2 years out

**Files:**
- `dashboard/src/components/roadmap/EpicEditModal.tsx` (new)

---

### e009_s03_t05: Filter Controls (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Depends:** t01

**Goal:** Filter roadmap view by status, visibility, and tags

**Implementation Notes:**
```typescript
interface RoadmapFilters {
  commitment_status: ('uncommitted' | 'committed')[];
  roadmap_status: ('not_started' | 'in_progress' | 'completed' | 'cancelled')[];
  show_internal: boolean;
  tags: string[];
}
```

**UI:**
- Chip-based multi-select for statuses
- Toggle for "Show internal items"
- Tag filter with autocomplete
- "Clear filters" button
- Persist filters in URL params

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

**Week 1:**
- Day 1-2: t01 (Canvas layout)
- Day 2-3: t02 (Epic card)
- Day 4-5: t03 (Drag-and-drop)

**Week 2:**
- Day 1-2: t04 (Edit modal)
- Day 3: t05 (Filters)
- Day 4: t06 (Optimistic updates)
- Day 5: Integration testing, polish

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

After Sprint 3:
- Sprint 4: History visualization and polish

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-009 (Product Roadmap)
**Sprint ID:** e009_s03
**Started:** —
**Participants:** —
