# SPRINT: Product Roadmap Sprint 5 - UAT & Polish

## Sprint Overview

**Sprint Goal**: Manual UAT testing and UI/UX polish for all roadmap features
**Duration**: 1 week (2026-01-13 to 2026-01-17)
**Type**: QA/Polish sprint
**Progress:** 50% (3/6 tasks complete)

**Success Criteria:**
- [ ] All drag-and-drop bugs resolved (including card duplication)
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] Data sync verified between dashboard and git
- [ ] Navigation workflows intuitive and tested
- [ ] Roadmap uses appropriate screen width on desktop

---

## Known Issues (From Initial Testing)

### BUG-001: Epic Card Duplication During Drag
**Severity:** HIGH
**Description:** When dragging an Epic card between lanes, the card appears duplicated - showing in both the original lane and the destination lane simultaneously.
**Screenshot:** Desktop Screenshot 2026-01-12 (EPIC-012 visible in both Next and Later lanes during drag)
**Expected:** Card should only appear at drag position with placeholder in original position
**Root Cause:** TBD - likely DnD Kit dragOverlay or state synchronization issue

### ISSUE-002: Roadmap Width Too Narrow on Desktop
**Severity:** MEDIUM
**Description:** Roadmap canvas doesn't utilize available screen width on desktop views, leaving excessive margins
**Expected:** Roadmap should expand to use ~90-95% of viewport width on desktop

---

## Sprint Tasks

### e009_s05_t01: Fix Card Duplication Bug (4h)
**Status:** [x] Complete
**Priority:** HIGH - CRITICAL
**Assignee:** chris@watchhill.ai

**Goal:** Resolve Epic card duplication during drag operations

**Investigation Areas:**
- `DragOverlay` component configuration in `RoadmapCanvas.tsx`
- State management during `onDragStart`/`onDragOver`/`onDragEnd`
- Optimistic update logic creating visual duplicates
- `activeId` state not properly hiding source card

**Files to Check:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx`
- `dashboard/src/components/roadmap/LaneSection.tsx`
- `dashboard/src/components/roadmap/EpicCard.tsx`

**Acceptance Criteria:**
- [ ] Dragged card appears only at cursor position
- [ ] Source position shows placeholder/ghost (not full card)
- [ ] No visual duplication in any lane during drag
- [ ] Smooth 60fps drag animation

---

### e009_s05_t02: Desktop Width Optimization (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Maximize roadmap canvas width on desktop displays

**Implementation Notes:**
- Adjust container max-width or remove constraint
- Consider fluid grid vs fixed breakpoints
- Maintain comfortable padding at screen edges
- Ensure lane columns scale proportionally

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx`
- `dashboard/src/app/roadmap/page.tsx` (container styles)

**Acceptance Criteria:**
- [ ] Roadmap uses 90-95% of viewport width on desktop (1920px+)
- [ ] Appropriate margins on ultra-wide displays
- [ ] No horizontal scrolling needed
- [ ] Cards scale appropriately with lane width

---

### e009_s05_t03: Mobile Drag-and-Drop Evaluation (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Evaluate and optimize mobile drag experience

**Key Question:** Does drag-and-drop work well on mobile, or should we use taps to change lanes via modal?

**Test Scenarios:**
1. Touch drag on iPhone (Safari)
2. Touch drag on iPad (Safari)
3. Touch drag on Android (Chrome)
4. Long-press recognition
5. Scroll vs drag conflict
6. Small touch targets

**Decision Point:** If drag UX is poor on mobile:
- Keep drag for desktop only
- Use tap → modal → lane selector for mobile
- Add device detection to switch modes

**Files:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx`
- `dashboard/src/components/roadmap/EpicCard.tsx`
- `dashboard/src/components/roadmap/EpicEditModal.tsx` (add lane selector)

**Acceptance Criteria:**
- [ ] Mobile interaction pattern documented (drag vs tap)
- [ ] No accidental drags when scrolling
- [ ] Touch targets ≥ 44px (iOS HIG)
- [ ] Works on iOS Safari and Android Chrome

---

### e009_s05_t04: Responsive Layout Testing (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Verify responsive behavior across breakpoints

**Test Matrix:**

| Viewport | Device | Test Areas |
|----------|--------|------------|
| 320-375px | iPhone SE/Mini | Lane stacking, card width, touch targets |
| 390-430px | iPhone Pro/Max | Lane stacking, readability |
| 768px | iPad Mini | 2-column or stacked lanes |
| 1024px | iPad Pro | Multi-column, drag behavior |
| 1440px | Laptop | Full layout, width utilization |
| 1920px+ | Desktop | Maximum width, spacing |

**Key Tests:**
- [ ] Lanes collapse to accordion on mobile
- [ ] Cards remain readable at all sizes
- [ ] Filters accessible on small screens
- [ ] No content overflow or clipping
- [ ] Text truncation with ellipsis

**Files:**
- All roadmap components
- Tailwind responsive classes

---

### e009_s05_t05: Data Sync Verification (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Verify bidirectional sync between dashboard and git

**Test Scenarios:**

**Dashboard → Git (via `ginko sync`):**
1. Edit Epic title in dashboard → verify markdown update
2. Change lane/status → verify frontmatter change
3. Update commitment factors → verify changes sync
4. Verify changelog entry created

**Git → Dashboard (via git push):**
1. Edit Epic markdown locally → verify dashboard reflects
2. Create new Epic file → verify appears in dashboard
3. Delete Epic file → verify removed from dashboard

**Files:**
- CLI: `packages/cli/src/commands/sync/`
- API: `dashboard/src/app/api/v1/graph/sync/`

**Acceptance Criteria:**
- [ ] Edits sync within 60 seconds
- [ ] No data loss in either direction
- [ ] Conflicts handled gracefully
- [ ] Changelog preserved

---

### e009_s05_t06: Navigation Workflow Testing (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Test navigation paths between Roadmap and Graph views

**Workflows to Test:**

1. **Roadmap → Graph (Epic detail):**
   - Click Epic card → Edit modal → "View in Graph" link
   - Verify Graph view centers on that node

2. **Graph → Roadmap:**
   - Click Epic node in Graph → Roadmap link
   - Verify Roadmap scrolls to/highlights that Epic

3. **Deep linking:**
   - `/roadmap?highlight=EPIC-009` → highlight specific epic
   - `/graph?node=EPIC-009` → center on specific node

4. **Breadcrumb navigation:**
   - Roadmap → Epic modal → Sprint → Task → back to Roadmap

**Files:**
- `dashboard/src/components/roadmap/EpicEditModal.tsx`
- `dashboard/src/app/graph/page.tsx`
- Navigation components

**Acceptance Criteria:**
- [ ] Seamless navigation between views
- [ ] Context preserved when switching views
- [ ] Deep links work correctly
- [ ] Back button behavior correct

---

## UAT Test Plan

### Phase 1: Bug Fixes (Day 1-2)
- [ ] t01: Fix card duplication bug
- [ ] t02: Desktop width optimization

### Phase 2: Mobile/Responsive (Day 2-3)
- [ ] t03: Mobile drag evaluation
- [ ] t04: Responsive layout testing

### Phase 3: Integration (Day 4)
- [ ] t05: Data sync verification
- [ ] t06: Navigation workflows

### Phase 4: Final Polish (Day 5)
- [ ] Address issues found in testing
- [ ] Documentation updates
- [ ] Release notes

---

## Test Environment

**Browsers:**
- Safari (macOS, iOS)
- Chrome (macOS, Android)
- Firefox (macOS)

**Devices:**
- iPhone 14 Pro (390px)
- iPad Pro 11" (1194px)
- MacBook Pro 14" (1512px)
- External display (1920px+)

**Test Data:**
- Production roadmap (12 epics)
- Test scenarios with 50+ epics

---

## Accomplishments This Sprint

### 2026-01-12: T01 Card Duplication Bug Fix

**Root Cause:** `DraggableEpicCard` was applying both `CSS.Translate.toString(transform)` (moving the card with drag) AND `DragOverlay` was rendering a separate card at the cursor position. This created visual duplication during drag.

**Solution:** Removed transform from `DraggableEpicCard` - the original card now stays in place as a static placeholder with `opacity-50` styling, while only `DragOverlay` shows the moving card.

**Files Changed:**
- `dashboard/src/components/roadmap/EpicCard.tsx:167` - Removed transform and CSS import

---

### 2026-01-12: T02 Desktop Width Optimization

**Problem:** Roadmap canvas was constrained to `max-w-4xl` (~896px), leaving excessive whitespace on desktop displays.

**Solution:** Changed to `max-w-7xl` (~1280px) with increased padding on large screens (`lg:px-8`).

**Files Changed:**
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx:479` - Updated container classes

---

### 2026-01-12: T03 Mobile Drag-and-Drop Evaluation

**UAT Results:**
| Test | Result |
|------|--------|
| Scroll page | ✅ Pass |
| Quick tap on card | ✅ Pass |
| Long-press + drag | ⚠️ Pass (text copy behavior triggered) |
| Drag while scrolling | ✅ Pass |
| Drag handle visibility | ✅ Pass |
| Touch target hit area | ✅ Pass |
| Modal lane change | ✅ Pass |
| Landscape (iPad) | ✅ Pass |
| Landscape (iPhone) | ❌ Not practical |

**Decision:** Keep drag-and-drop for mobile with improvements. Modal lane selector remains as fallback.

**Fixes Applied:**
1. **Text selection disabled** - Added `select-none` + webkit touch callout styles to prevent iOS copy behavior
2. **Faster drag activation** - Reduced TouchSensor delay from 250ms to 150ms
3. **Better drag feedback** - Card now scales to 105% with shadow when dragging (was 102% with opacity)
4. **Landscape hint** - Shows "Rotate to portrait" banner on phones in landscape (max-height 500px)

**Files Changed:**
- `dashboard/src/components/roadmap/EpicCard.tsx` - isOverlay prop, placeholder/overlay differentiation, select-none
- `dashboard/src/components/roadmap/RoadmapCanvas.tsx` - MouseSensor for desktop, TouchSensor for mobile

**Final Implementation (after iterative UAT):**
- **MouseSensor**: Desktop mouse drag with 8px distance activation (ignores touch events)
- **TouchSensor**: Mobile long-press with 250ms delay, 8px tolerance (allows scrolling)
- **Placeholder styling**: Dashed green border, 40% opacity, light green tint
- **Overlay styling**: Scale 105%, shadow, solid green border, 2° rotation
- **Text selection**: `select-none` prevents iOS copy behavior

**Tests Passed (iPhone Safari):**
- Scroll page: ✅
- Long-press drag: ✅
- Drop to new lane: ✅

---

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-009 (Product Roadmap)
**Sprint ID:** e009_s05
**Started:** 2026-01-12
**Participants:** Chris Norton, Claude
