# UAT Test Plan: EPIC-006 Sprint 3 - UX Polish & UAT

**Date:** 2025-12-29
**Tester:** Chris Norton
**Production URL:** https://app.ginkoai.com
**Sprint:** UX Polish Sprint 3

---

## Test Environment

- **Dashboard URL:** https://app.ginkoai.com/dashboard/graph
- **Graph ID:** gin_1762125961056_dg4bsd
- **Browser:** [To be filled]
- **Device:** [To be filled]

---

## Test Scenarios

### 1. Navigation Flows (C4-Style)

#### 1.1 Project View (Top Level)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.1.1 | Load `/dashboard/graph` | Project view displays with category cards | | |
| 1.1.2 | Category cards show counts | Each category shows node count | | |
| 1.1.3 | Click category card | Navigates to CategoryView | | |

#### 1.2 Category View
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.2.1 | View ADR category | Lists all ADR nodes | | |
| 1.2.2 | View Sprint category | Lists all Sprint nodes | | |
| 1.2.3 | View Task category | Lists all Task nodes | | |
| 1.2.4 | Pagination works | Can load more nodes if > page size | | |
| 1.2.5 | Click node card | Opens NodeView/detail | | |
| 1.2.6 | Empty category | Shows appropriate empty state | | |

#### 1.3 Node View (Detail)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.3.1 | View ADR node | Shows title, content, metadata | | |
| 1.3.2 | View Sprint node | Shows sprint details, progress | | |
| 1.3.3 | View Task node | Shows task details, status | | |
| 1.3.4 | Related nodes display | Shows related ADRs, tasks, etc. | | |
| 1.3.5 | Click related node | Navigates with breadcrumb trail | | |

#### 1.4 Breadcrumb Navigation
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.4.1 | Breadcrumbs appear | Shows Project > Category > Node | | |
| 1.4.2 | Click "Project" | Returns to ProjectView | | |
| 1.4.3 | Click category | Returns to CategoryView | | |
| 1.4.4 | Deep navigation | Breadcrumbs accumulate correctly | | |
| 1.4.5 | Stale breadcrumbs | Deleted nodes filtered out | | |

#### 1.5 Tree Explorer Sidebar
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.5.1 | Tree loads | Shows hierarchical node structure | | |
| 1.5.2 | Expand/collapse | Tree nodes expand/collapse | | |
| 1.5.3 | Select from tree | Main view updates to show node | | |
| 1.5.4 | Collapse sidebar | Sidebar minimizes | | |

---

### 2. Editing Workflows

#### 2.1 Node Editor Modal
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1.1 | Open edit modal | Click edit button opens modal | | |
| 2.1.2 | Edit title/name | Can modify text fields | | |
| 2.1.3 | Edit content | Markdown editor works | | |
| 2.1.4 | Save changes | Updates persist to graph | | |
| 2.1.5 | Cancel edit | Closes without saving | | |
| 2.1.6 | Validation | Required fields show errors | | |

#### 2.2 Status Updates
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.2.1 | Change task status | Dropdown works, saves | | |
| 2.2.2 | Mark task complete | Status updates visually | | |

---

### 3. My Tasks Integration

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1 | My Tasks appears | Shows assigned tasks | | |
| 3.2 | Click task | Navigates to task detail | | |
| 3.3 | Task count accurate | Matches actual assignments | | |
| 3.4 | Status sync | Changes in graph reflect in My Tasks | | |

---

### 4. Edge Cases & Error Handling

#### 4.1 Invalid URLs
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1.1 | Invalid node ID | Shows "Node not found" message | | |
| 4.1.2 | Invalid category | Handles gracefully | | |

#### 4.2 Loading States
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.2.1 | Initial load | Shows skeleton/loading UI | | |
| 4.2.2 | Category load | Shows loading state | | |
| 4.2.3 | Node load | Shows loading state | | |

#### 4.3 Error States
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.3.1 | API failure | Error boundary catches, shows message | | |
| 4.3.2 | Network error | Graceful degradation | | |

---

### 5. Performance

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1 | Initial page load | < 2 seconds | | |
| 5.2 | Category switch | < 1 second | | |
| 5.3 | Node detail load | < 1 second | | |
| 5.4 | Large category | Pagination prevents slowdown | | |

---

### 6. Visual Polish

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 6.1 | Consistent styling | Ginko branding throughout | | |
| 6.2 | View transitions | Smooth animations | | |
| 6.3 | Responsive layout | Works on different screen sizes | | |
| 6.4 | Dark/light mode | Consistent theming | | |

---

## API Endpoint Tests (2025-12-29)

### Endpoints Tested

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 1 | GET /graph/nodes | PASS | 859 total nodes, returns correctly |
| 2 | GET /graph/nodes?labels=ADR | PASS | 64 ADRs returned |
| 3 | GET /graph/nodes?labels=Sprint | PASS | 13 Sprints returned |
| 4 | GET /graph/nodes?labels=Task | PASS | 223 Tasks returned |
| 5 | GET /graph/nodes?labels=Pattern | PASS | 2 Patterns returned |
| 6 | GET /graph/nodes?labels=Gotcha | PASS | 10 Gotchas returned |
| 7 | GET /graph/nodes?labels=Event | PASS | 235 Events returned |
| 8 | GET /graph/nodes/:id | PASS | Returns full node with properties |
| 9 | GET /graph/nodes (pagination) | PASS | Offset/limit works |
| 10 | GET /graph/nodes/unsynced | **FAIL** | Neo4j type error (see BUG-001) |
| 11 | POST /graph/query (semantic) | **FAIL** | Embedding service not configured |
| 12 | GET /graph/status | PASS | Returns healthy status |
| 13 | GET /sprint/active | PASS | Returns active sprint (e006_s02) |
| 14 | GET /graph/adjacencies/:id | PASS | Returns 41 related nodes |
| 15 | PATCH /graph/nodes/:id | N/A | Test node doesn't exist in graph |

### Summary
- **Passed:** 12/15
- **Failed:** 2/15
- **N/A:** 1/15

---

## Issues Found

| ID | Severity | Description | Steps to Reproduce | Status |
|----|----------|-------------|-------------------|--------|
| BUG-001 | HIGH | Unsynced nodes endpoint fails with Neo4j type error | GET /graph/nodes/unsynced returns "Invalid input. '100.0' is not a valid value. Must be a non-negative integer." - JavaScript number passed to Neo4j LIMIT without integer conversion | **FIXED** |
| BUG-002 | MEDIUM | Semantic search unavailable | POST /graph/query returns "Embedding service not configured" - semantic search doesn't work | Open |
| BUG-003 | MEDIUM | Duplicate task nodes in graph | Tasks e006_s03_t12-t18 each appear 4 times - data duplication issue | Open |
| BUG-004 | LOW | Sprint 3 not synced to graph | Current sprint (e006_s03) doesn't exist in graph, only tasks from previous sync | Open |
| BUG-005 | LOW | Active sprint mismatch | Active sprint shows e006_s02 but current sprint file is Sprint 3 | Open |

---

## Enhancement Requests

| ID | Priority | Description | Rationale |
|----|----------|-------------|-----------|
| ENH-001 | LOW | Add /graph/stats endpoint | Would be useful for dashboard metrics |
| ENH-002 | MEDIUM | Re-enable semantic search | Requires Voyage AI embedding service configuration |

---

## Summary

**API Tests Passed:** 12/15
**API Tests Failed:** 2/15
**Blockers:** 1 (BUG-001 blocks unsynced banner feature)

**Overall Assessment:** Core API functionality is healthy. Graph status shows 521 nodes with 1711 relationships. Main listing and detail endpoints work correctly. Two failures relate to optional features (unsynced nodes, semantic search).

**Recommendations:**
1. ~~**Fix BUG-001 (HIGH):** Add `neo4j.int()` wrapper around limit parameter in unsynced route~~ **DONE**
2. **Investigate BUG-003:** Determine cause of task duplication and clean up
3. **Sync Sprint 3:** Run `ginko sync` to push current sprint to graph
4. **Configure embedding service:** To enable semantic search (ENH-002)

---

## Fix Log

### 2025-12-29: BUG-001 Fixed
- **Issue:** Unsynced nodes endpoint returning Neo4j type error
- **Root Cause:** JavaScript number passed to Neo4j LIMIT clause without integer conversion
- **Fix:** Added `import neo4j from 'neo4j-driver'` and wrapped limit with `neo4j.int(limit)`
- **File:** `dashboard/src/app/api/v1/graph/nodes/unsynced/route.ts:117`
- **Verified:** Endpoint now returns 100 unsynced nodes correctly
