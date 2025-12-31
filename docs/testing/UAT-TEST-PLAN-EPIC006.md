# UAT Test Plan - EPIC-006 UX Polish & Dashboard

**Sprint:** UX Polish Sprint 3 - Polish & UAT
**Task:** e006_s03_t04
**Tester:** Chris Norton
**Date:** 2025-12-31

---

## Test Environment

- **URL:** https://app.ginkoai.com
- **Browser:** Chrome (primary), Safari (secondary)
- **Auth:** GitHub OAuth

---

## Test Scenarios

### 1. Authentication Flow

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 1.1 | Login via GitHub | Click Login → Select GitHub → Authorize | Redirect to /dashboard | ✅ Pass | |
| 1.2 | Session persistence | Close tab → Reopen app.ginkoai.com | Stay logged in | ✅ Pass | |
| 1.3 | Logout | Click profile → Logout | Return to landing page | ✅ Pass | |

---

### 2. Graph Navigation (C4-Style)

#### 2.1 Project View (Root)

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 2.1.1 | Charter display | Navigate to Graph tab | Charter hero card shows project name, goals | ✅ Pass | |
| 2.1.2 | Summary cards | View Project View | See counts for Epic, Sprint, Task, ADR, Pattern, Gotcha, Principle | ⚠️ Issue | See B1, B2 |
| 2.1.3 | Status preview | Check Task summary card | Shows progress bar (e.g., "5 Tasks ███░░ 3/5") | ⚠️ Issue | See B3 |
| 2.1.4 | Click category | Click on "ADR" summary card | Navigate to Category View showing ADRs | ✅ Pass | |

#### 2.2 Category View (Node Type Grid)

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 2.2.1 | Grid display | Click any summary card | See grid of condensed node cards | ✅ Pass | |
| 2.2.2 | Card info | View condensed cards | Show title, status badge, brief summary | ⚠️ Issue | See E5 |
| 2.2.3 | Click node | Click any node card | Navigate to Node View | ⚠️ Issue | See B4 |
| 2.2.4 | Breadcrumb back | Click "Project" in breadcrumb | Return to Project View | ✅ Pass | |
| 2.2.5 | Empty state | Navigate to category with 0 nodes | Show helpful empty state message | ⚠️ Issue | See B5 |

#### 2.3 Node View (Full Detail)

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 2.3.1 | Full content | Click into any node | See full markdown content rendered | ✅ Pass | |
| 2.3.2 | Metadata display | View node detail | Show status, priority, dates, assignee (if applicable) | ⚠️ Issue | See B6, B7, B8 |
| 2.3.3 | Related nodes | Scroll to related section | See related nodes grouped by type as Summary Cards | ✅ Pass | |
| 2.3.4 | Navigate related | Click a related node | Navigate to that node's view | ⚠️ Issue | See B9 |
| 2.3.5 | Breadcrumb trail | Deep navigate 3+ levels | Breadcrumb shows full path, all clickable | ⚠️ Issue | See B10 |
| 2.3.6 | Edit button | Click Edit on a node | Open NodeEditorModal | ✅ Pass | |

---

### 3. Node Editing

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 3.1 | Open editor | Click Edit on any node | Modal opens with form fields | ⚠️ Issue | See B11 |
| 3.2 | Edit title | Change title → Save | Title updates, modal closes | ⚠️ Issue | See B20, B21 |
| 3.3 | Edit content | Modify markdown content → Save | Content updates in view | ⚠️ Issue | See B20 |
| 3.4 | Edit status | Change status dropdown → Save | Status badge updates | ⚠️ Issue | See B20 |
| 3.5 | Cancel edit | Make changes → Cancel | Changes discarded, modal closes | ✅ Pass | |
| 3.6 | Markdown preview | Toggle preview in editor | See rendered markdown | ✅ Pass | |
| 3.7 | Validation | Clear required field → Save | Show validation error | ✅ Pass | |

---

### 4. My Tasks (Focus Tab)

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 4.1 | Tasks load | Navigate to Focus tab | See "My Tasks" section | ✅ Pass | |
| 4.2 | Grouped by status | View task list | Tasks grouped: In Progress, Todo, Paused | ⚠️ Issue | See B13 |
| 4.3 | Priority badges | View task cards | Priority shown with color-coded badge | ⚠️ Issue | See B14 |
| 4.4 | Quick look | Click task card | TaskQuickLookModal opens | ✅ Pass | |
| 4.5 | Modal content | View quick look modal | Shows full task details, patterns, gotchas | ⚠️ Issue | See B15 |
| 4.6 | Navigate to node | Click "Open in Graph" from modal | Navigate to Task in Node View | ⚠️ Issue | See B14 |
| 4.7 | Empty state | (If no assigned tasks) | Show helpful message | ✅ Pass | |

---

### 5. Sprint Progress

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 5.1 | Progress card | View Focus tab | Sprint progress card shows current sprint | | |
| 5.2 | Progress bar | Check progress display | Visual progress bar matches task completion % | | |
| 5.3 | Task counts | View sprint details | Shows complete/total counts | | |

---

### 6. Insights Section

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 6.1 | Insights load | Navigate to Insights tab | Coaching insights display | ✅ Pass | |
| 6.2 | Category tabs | Click different category tabs | Insights filter by category | ✅ Pass | |
| 6.3 | Principle link | Click recommendation | Modal shows linked Principle | ✅ Pass | |
| 6.4 | Evidence expand | Click evidence item | Modal shows source record with timestamp | ⚠️ Issue | See B16 |
| 6.5 | Sidebar collapse | Click collapse toggle | Sidebar collapses to icons | ✅ Pass | |
| 6.6 | Period filter | Change time period dropdown | Insights update for selected period | ✅ Pass | |

---

### 7. Sync Features

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 7.1 | Unsynced banner | (When nodes edited in dashboard) | Banner shows "X nodes edited" | | |
| 7.2 | CLI sync pull | Run `ginko sync` from CLI | Changes pulled to local files | | |

---

### 8. Performance

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 8.1 | Initial load | Navigate to /dashboard | Page loads < 2s | | |
| 8.2 | Graph navigation | Click through Project → Category → Node | Each transition < 1s | | |
| 8.3 | Large category | View category with 20+ nodes | No visible lag, smooth scroll | | |

---

### 9. Edge Cases & Error Handling

| # | Test Case | Steps | Expected Result | Pass/Fail | Notes |
|---|-----------|-------|-----------------|-----------|-------|
| 9.1 | Invalid URL | Navigate to /dashboard/graph?node=invalid | Graceful error, not crash | | |
| 9.2 | Stale breadcrumb | Delete node → Click stale breadcrumb | Handles gracefully | | |
| 9.3 | Network error | Disable network → Try action | Shows error message, not crash | | |
| 9.4 | Concurrent edit | Edit same node in 2 tabs | No data loss | | |

---

## Issue Tracking

### Bugs Found

| # | Severity | Description | Steps to Reproduce | Screenshot |
|---|----------|-------------|-------------------|------------|
| B1 | High | Sprint progress bar mismatch - shows 0/12 but bar is ~50% full | Graph → Project View → Sprint card | |
| B2 | High | Hero Tasks progress bar shows 0% but counts show 36/100 complete | Graph → Project View → Hero section | |
| B3 | Medium | Task count mismatch - summary shows 36/112, category shows 115 tasks | Graph → Project View vs Tasks Category | |
| B4 | High | Clicking node card doesn't navigate - only pop-out icon works | Graph → Category View → Click card body | |
| B5 | Medium | Principles category shows 0 but principles exist in graph | Graph → Project View → Principles card | |
| B6 | Low | No assignee field displayed on task nodes | Graph → Node View → Task detail | |
| B7 | Low | "editedBy" field should use label "Edited by" | Graph → Node View → Metadata section | |
| B8 | Medium | editedBy shows user ID "user_Z2tfODgx" instead of name/email | Graph → Node View → Metadata section | |
| B9 | High | Related nodes don't navigate when clicked - shows empty "graphs(1)" toggle | Graph → Node View → Related section | |
| B10 | Medium | Can't find Task nodes with actual content to test deep navigation | Graph → Tasks Category → Various tasks | |
| B11 | Medium | Sprint edit modal doesn't populate goal content - no markdown shown | Graph → Sprint node → Edit | |
| B12 | **Critical** | Save fails: "graphId query parameter is required" - blocks all editing | Graph → Any node → Edit → Save | |
| B13 | Medium | My Tasks only shows Todo status - no In Progress or Complete groups | Focus → My Tasks | |
| B14 | High | "View in Graph" shows "Node Not Found" for all tasks | Focus → My Tasks → Any task → View in Graph | |
| B15 | Medium | All task quick look modals show "No description provided" (possible data issue) | Focus → My Tasks → Click task | |
| B16 | Medium | Evidence items don't trigger modal when clicked | Insights → Any insight → Click evidence | |
| B17 | High | Refresh icon causes React error #31 (object passed as child) | Insights → Click refresh icon | |
| B18 | Low | Console warning: Missing Description or aria-describedby for DialogContent | Open any modal → Check console | |
| B19 | Medium | 400 error loading malformed node ID "SPRINT-2025-11-10-" | Console error on page load | |
| B20 | Medium | UI doesn't refresh after save - must manually refresh to see updated data | Graph → Edit node → Save → View | |
| B21 | Medium | Page refresh navigates to Focus tab instead of staying on current page | Any page → Browser refresh | |

### Enhancement Requests

| # | Priority | Description | Rationale |
|---|----------|-------------|-----------|
| E1 | Medium | Use ginko logo on logged-out landing page | Brand consistency |
| E2 | Medium | Use green corner brackets on landing page | Match marketing site styling |
| E3 | Low | Add "Copied" toast for NPM command CTA | Match marketing site UX |
| E4 | Medium | Match body text size to marketing site | Visual consistency |
| E5 | Medium | Make category cards larger with summary text | Cards show status/title/priority but no summary - less scannable |
| E6 | Medium | Insights section font size too small | Readability |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | Chris Norton | | |
| Developer | | | |

---

## Notes

_Add any observations, suggestions, or general feedback here._
