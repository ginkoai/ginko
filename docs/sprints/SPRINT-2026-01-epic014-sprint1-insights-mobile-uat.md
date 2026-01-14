# SPRINT: Insights Mobile UAT & Polish

## Sprint Overview

**Sprint Goal**: Test and refine the Insights mobile view UI, validate correct display of all data
**Duration**: 1-2 days
**Type**: QA/Polish sprint
**Progress:** 0% (0/0 tasks complete)

**Success Criteria:**
- [ ] Insights page renders correctly on mobile (375-430px)
- [ ] All data visible without horizontal overflow
- [ ] All content reachable via vertical scrolling
- [ ] Touch targets appropriately sized (44px minimum)

---

## Noted Issues (From Mobile UAT)

### ISSUE-001: Redundant Header Text
**Severity:** LOW
**Description:** "Coaching Insights" header and "AI-driven analysis..." in description are redundant with the "Coaching Insights" label in each card.
**Action:** Remove redundant text from header

### ISSUE-002: Last Analysis Circle Overflow
**Severity:** HIGH
**Description:** Last Analysis badge/circle extends beyond mobile viewport width, causing horizontal scroll.
**Action:** Remove on mobile (also redundant with analysis period display)

### ISSUE-003: Coaching Insights Label Breaks
**Severity:** MEDIUM
**Description:** "Coaching Insights" label doesn't extend full card width, causes awkward line breaks.
**Action:** Make label full-width with no breaks

### ISSUE-004: Analysis Period Position
**Severity:** LOW
**Description:** Analysis Period label position unclear on mobile.
**Action:** Place below "Coaching Insights" title on mobile

### ISSUE-005: Scoring Widgets Horizontal Layout
**Severity:** HIGH
**Description:** Category score cards in 2-column grid cause cramping on mobile.
**Action:** Stack all scoring widgets vertically (one per row) on mobile

### ISSUE-006: Analysis Detail Card Layout
**Severity:** MEDIUM
**Description:** Toggle, Harvey ball, and score mixed with title/description.
**Action:** Place toggle + harvey ball + score at top row, title + description below, full card width

### ISSUE-007: Footer Not Scrollable
**Severity:** MEDIUM
**Description:** "Need Fresh Insights?" footer not reachable by scrolling.
**Action:** Add padding/margin at bottom to allow scrolling to footer

---

## Sprint Tasks

### TASK-1: Remove Redundant Header Text (15m)
**Status:** [ ] Not Started
**Priority:** LOW
**Assignee:** chris@watchhill.ai

**Goal:** Simplify header by removing redundancy

**Implementation:**
- Option A: Remove "Coaching Insights" from CardTitle, keep only analysis period
- Option B: Keep title, remove "AI-driven analysis" from description

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:140-144`

**Mobile Behavior:**
- Header should be clean and compact

---

### TASK-2: Hide Last Analysis Badge on Mobile (20m)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Prevent horizontal overflow from Last Analysis badge

**Implementation:**
```tsx
// Add responsive hiding
<Badge className="hidden md:inline-flex bg-secondary text-muted-foreground">
  Last analyzed: ...
</Badge>
```

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:151-153`

**Acceptance Criteria:**
- [ ] No horizontal scroll on mobile
- [ ] Badge visible on tablet+ (768px+)

---

### TASK-3: Full-Width Coaching Insights Label (15m)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Ensure title doesn't wrap awkwardly

**Implementation:**
```tsx
<CardTitle className="text-xl whitespace-nowrap">Coaching Insights</CardTitle>
```

Or use responsive text size:
```tsx
<CardTitle className="text-lg md:text-xl">Coaching Insights</CardTitle>
```

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:140`

---

### TASK-4: Reposition Analysis Period for Mobile (25m)
**Status:** [ ] Not Started
**Priority:** LOW
**Assignee:** chris@watchhill.ai

**Goal:** Stack header elements vertically on mobile

**Implementation:**
```tsx
<CardHeader>
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
    <div>
      <CardTitle>Coaching Insights</CardTitle>
      <CardDescription className="mt-1">
        Analysis period: {days} days (...)
      </CardDescription>
    </div>
    {/* Timescale selector and badge - hidden on mobile */}
    <div className="hidden md:flex items-center gap-3">
      <TimescaleSelector ... />
      <Badge ...>Last analyzed: ...</Badge>
    </div>
  </div>
</CardHeader>
```

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:136-156`

---

### TASK-5: Stack Scoring Widgets Vertically on Mobile (30m)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Single column grid for category scores on mobile

**Current (line 238):**
```tsx
<div className="flex-1 grid grid-cols-2 gap-3">
```

**Implementation:**
```tsx
<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
```

**Additional Consideration:**
- Score circle + grid should also stack on mobile:
```tsx
<div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
  {/* Score Circle */}
  <div className="text-center shrink-0">...</div>
  {/* Category Scores Grid */}
  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
    ...
  </div>
</div>
```

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:158-248`

**Acceptance Criteria:**
- [ ] All 4 category cards visible in single column on mobile
- [ ] Cards fill available width
- [ ] No horizontal scroll

---

### TASK-6: Reorder Analysis Detail Cards for Mobile (45m)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Toggle, Harvey ball, and score at top; title and description below

**Current Structure (InsightCard.tsx):**
- Title and description mixed with controls

**Target Mobile Layout:**
```
┌─────────────────────────────────────┐
│ [Toggle] [●●○○] [Score: 78]         │  <- Controls row
├─────────────────────────────────────┤
│ Context Switching Frequency         │  <- Title (full width)
│                                     │
│ Team shows high context switching   │  <- Description (full width)
│ patterns. Consider longer focus...  │
└─────────────────────────────────────┘
```

**Implementation:**
```tsx
// Mobile: stack vertically
<div className="flex flex-col gap-3">
  {/* Controls row - always on top for mobile */}
  <div className="flex items-center justify-between">
    <button onClick={...}>{expanded ? <ChevronDown/> : <ChevronRight/>}</button>
    <div className="flex items-center gap-2">
      <HarveyBall score={insight.score} />
      <Badge>Score: {insight.metricValue}</Badge>
    </div>
  </div>

  {/* Content - full width */}
  <div>
    <h4 className="font-medium">{insight.title}</h4>
    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
  </div>
</div>
```

**Files:**
- `dashboard/src/components/insights/InsightCard.tsx`

**Acceptance Criteria:**
- [ ] Controls visible at top on mobile
- [ ] Title/description use full card width
- [ ] Card remains functional (expand/collapse works)

---

### TASK-7: Add Bottom Scroll Padding for Footer (10m)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** Ensure "Need Fresh Insights?" footer is reachable by scrolling

**Implementation:**
Add padding to the container or the last element:
```tsx
// Option 1: Add to container
<div className="space-y-6 pb-24">

// Option 2: Add to footer card specifically
<Card className="p-4 mb-24">
```

**Files:**
- `dashboard/src/components/insights/InsightsOverview.tsx:133` (container)
- Or: `dashboard/src/app/dashboard/insights/page-client.tsx` (page wrapper)

**Acceptance Criteria:**
- [ ] Footer visible when scrolling to bottom on mobile
- [ ] No awkward cut-off of content

---

## Test Plan

### Mobile Devices to Test
- iPhone SE (375px) - smallest common viewport
- iPhone 14/15 (390-393px) - standard iPhone
- iPhone 14 Pro Max (430px) - large iPhone

### Test Scenarios
1. [ ] Load Insights page - no horizontal scroll
2. [ ] All category score cards visible in single column
3. [ ] Header readable without truncation
4. [ ] Each insight card properly laid out
5. [ ] Scroll to reach footer "Need Fresh Insights?"
6. [ ] Expand/collapse insight cards works
7. [ ] Tap targets adequate (44px+)

---

## Accomplishments This Sprint

[To be updated as tasks complete]

---

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-014 (Dashboard Maintenance Q1-2026)
**Sprint ID:** e014_s01
**Started:** 2026-01-12
**Participants:** Chris Norton, Claude
