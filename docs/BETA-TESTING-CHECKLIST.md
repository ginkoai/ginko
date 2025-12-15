/**
 * @fileType: checklist
 * @status: current
 * @updated: 2025-12-15
 * @tags: [beta, testing, qa, launch, checklist]
 * @related: [QUICK-START.md, PROJECT-CHARTER.md]
 * @priority: critical
 * @complexity: medium
 */

# Beta Testing Checklist

Pre-launch testing checklist for Ginko beta release. Execute all scenarios before releasing to beta users.

---

## Test Environment

- **CLI Version:** `@ginko/cli@beta`
- **Dashboard:** https://app.ginkoai.com
- **Graph Database:** Neo4j Aura (production)
- **Test Date:** _______________
- **Tester:** _______________

---

## 1. Fresh User Onboarding Flow

### 1.1 CLI Installation
- [ ] `npm install -g @ginko/cli@beta` completes without errors
- [ ] `ginko --version` displays version number
- [ ] `ginko --help` shows all available commands

### 1.2 Authentication
- [ ] `ginko login` opens browser for GitHub OAuth
- [ ] OAuth flow completes successfully
- [ ] API key stored at `~/.ginko/auth.json`
- [ ] `ginko whoami` displays authenticated user

### 1.3 Project Initialization
- [ ] `ginko init` creates `.ginko/` directory structure
- [ ] `.ginko/config.json` created with valid settings
- [ ] Graph connection established (or graceful offline mode)

### 1.4 Charter Creation (Optional)
- [ ] `ginko charter` outputs AI-mediated template
- [ ] Conversation flow is natural and helpful
- [ ] Charter saved to `docs/PROJECT-CHARTER.md`
- [ ] Charter synced to graph (if connected)

**Notes:** _______________________________________________

---

## 2. CLI Session Workflow

### 2.1 Session Start
- [ ] `ginko start` completes in < 2 seconds
- [ ] Context loaded (events displayed or "Cold start" indicated)
- [ ] Session log initialized at `.ginko/sessions/[user]/current-session-log.md`
- [ ] Event queue started (background sync)
- [ ] No hanging processes after command completes

### 2.2 Session Logging
- [ ] `ginko log "test message"` creates event
- [ ] Event written to `current-events.jsonl`
- [ ] Categories work: `--category=fix|feature|decision|insight|achievement`
- [ ] Impact levels work: `--impact=high|medium|low`
- [ ] File references work: `--files=path/to/file.ts:42`
- [ ] Quality feedback displayed (Excellent/Good/Needs improvement)

### 2.3 Session Handoff
- [ ] `ginko handoff "summary"` archives current session
- [ ] Session log moved to `archive/` directory
- [ ] Handoff event created with summary
- [ ] New session can start cleanly after handoff

### 2.4 Context Commands
- [ ] `ginko status` shows current session state
- [ ] `ginko context` displays loaded context summary

**Notes:** _______________________________________________

---

## 3. Graph Visualization (Dashboard)

### 3.1 Authentication
- [ ] Dashboard login with GitHub OAuth works
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

### 3.2 Tree Explorer
- [ ] Tree loads with project hierarchy
- [ ] Expand/collapse folders works
- [ ] Search (⌘F) filters nodes correctly
- [ ] Node count displays in footer
- [ ] Collapse/expand tree panel works

### 3.3 Card Grid
- [ ] Nodes display in grid layout
- [ ] Type filter checkboxes work
- [ ] Search box filters visible nodes
- [ ] Sort options work (name, created, updated)
- [ ] Pagination works (Previous/Next)
- [ ] Click to select highlights card
- [ ] View details opens right panel

### 3.4 Node Detail Panel
- [ ] Panel slides in smoothly
- [ ] Node properties display correctly
- [ ] Related nodes (adjacencies) show
- [ ] Breadcrumb navigation works
- [ ] Close button dismisses panel
- [ ] Deep link URL updates (?node=id)

### 3.5 Node Types Display Correctly
- [ ] Tasks show: task_id, status, priority, assignee
- [ ] ADRs show: adr_id, status, decision, consequences
- [ ] Sprints show: sprint_id, dates, progress
- [ ] Epics show: epic_id, goal, status
- [ ] Patterns show: pattern_id, confidence, description
- [ ] Gotchas show: severity, mitigation

**Notes:** _______________________________________________

---

## 4. Coaching Insights (Dashboard)

### 4.1 Insights Page Load
- [ ] Page loads without errors
- [ ] Demo mode toggle works
- [ ] Demo data displays sample insights

### 4.2 Overall Score
- [ ] Score displays (0-100)
- [ ] Color gradient correct (red→orange→yellow→cyan→green)
- [ ] Trend indicator shows (up/down/flat)
- [ ] Analysis period displayed

### 4.3 Category Cards
- [ ] All 4 categories display (Efficiency, Patterns, Quality, Anti-patterns)
- [ ] Category scores show
- [ ] Click filters insights list
- [ ] Counts (critical, warning) accurate

### 4.4 Insight Cards
- [ ] Severity icons display correctly
- [ ] Score impact badges show (+/- points)
- [ ] Expand/collapse works
- [ ] Evidence section shows references
- [ ] Recommendations list displays

### 4.5 CLI Integration
- [ ] `ginko insights --json` generates report (if implemented)
- [ ] Dashboard loads from localStorage cache
- [ ] Refresh button works

**Notes:** _______________________________________________

---

## 5. Knowledge Editing & Sync

### 5.1 Creating Nodes (Dashboard)
- [ ] "New" button available in graph view
- [ ] Node type selection works
- [ ] Form fields match schema for each type
- [ ] Validation errors display
- [ ] Save creates node in graph
- [ ] "Pending Sync" badge appears

### 5.2 Editing Nodes (Dashboard)
- [ ] Edit button opens editor
- [ ] Existing values populated
- [ ] Changes save correctly
- [ ] "Pending Sync" badge appears after edit

### 5.3 CLI Sync
- [ ] `ginko sync --dry-run` shows what would sync
- [ ] `ginko sync` pulls changes to local files
- [ ] Files created/updated in correct locations
- [ ] Commit created with descriptive message
- [ ] Dashboard badge clears after sync

### 5.4 Unsynced Notifications
- [ ] Dashboard shows unsynced count banner
- [ ] CLI shows warning at session start
- [ ] Action items card displays sync prompt

**Notes:** _______________________________________________

---

## 6. Focus Page (Dashboard)

### 6.1 Sprint Progress Card
- [ ] Active sprint displays
- [ ] Progress bar shows correct %
- [ ] Days ahead/behind calculates correctly
- [ ] Task counts accurate (complete, in-progress, pending)
- [ ] Empty state shows when no sprint

### 6.2 My Tasks List
- [ ] Tasks assigned to user display
- [ ] Priority badges show (Critical, High, Medium, Low)
- [ ] Status grouping works (In Progress, To Do, Paused)
- [ ] Click navigates to graph with task selected
- [ ] Empty state when no tasks

### 6.3 Last Session Summary
- [ ] Most recent session displays
- [ ] High-impact events highlighted
- [ ] Timestamp shows correctly
- [ ] Empty state when no recent sessions

### 6.4 Recent Completions
- [ ] Team completions display
- [ ] Type badges (task/event) show
- [ ] User attribution correct ("You" vs others)
- [ ] Timestamps accurate
- [ ] Empty state when no completions

### 6.5 Action Items
- [ ] Unsynced nodes warning displays
- [ ] Copy command button works
- [ ] "All caught up!" state shows when no items
- [ ] Collapsible behavior works

**Notes:** _______________________________________________

---

## 7. Cross-Browser Testing

### 7.1 Chrome (Primary)
- [ ] All features work as expected
- [ ] No console errors
- [ ] Responsive layout correct

### 7.2 Firefox
- [ ] Dashboard loads correctly
- [ ] Graph visualization works
- [ ] Forms submit properly

### 7.3 Safari
- [ ] Dashboard loads correctly
- [ ] OAuth flow works
- [ ] No Safari-specific issues

### 7.4 Edge
- [ ] Dashboard loads correctly
- [ ] Basic functionality works

**Notes:** _______________________________________________

---

## 8. Error Handling & Edge Cases

### 8.1 Network Errors
- [ ] CLI handles offline gracefully
- [ ] Dashboard shows error states (not blank)
- [ ] Retry mechanisms work

### 8.2 Authentication Errors
- [ ] Expired token triggers re-auth prompt
- [ ] Invalid credentials show clear error
- [ ] OAuth cancellation handled

### 8.3 Empty States
- [ ] New project with no data displays correctly
- [ ] Empty sprint shows appropriate message
- [ ] No tasks assigned shows empty state

### 8.4 Invalid Data
- [ ] Malformed events don't crash CLI
- [ ] Missing node properties handled gracefully
- [ ] Date parsing errors caught

**Notes:** _______________________________________________

---

## 9. Performance

### 9.1 CLI Performance
- [ ] `ginko start` < 2 seconds (target)
- [ ] `ginko log` < 500ms
- [ ] `ginko handoff` < 2 seconds
- [ ] No memory leaks in long sessions

### 9.2 Dashboard Performance
- [ ] Initial page load < 3 seconds
- [ ] Graph with 100+ nodes responsive
- [ ] Filtering/sorting instantaneous
- [ ] No jank during animations

**Notes:** _______________________________________________

---

## 10. Security

### 10.1 Authentication
- [ ] API keys not exposed in logs
- [ ] OAuth tokens stored securely
- [ ] No credentials in URL parameters

### 10.2 Data Access
- [ ] Users can only access their graphs
- [ ] Private projects not visible to others
- [ ] API validates authorization on all endpoints

### 10.3 Input Validation
- [ ] XSS attempts blocked
- [ ] SQL/Cypher injection prevented
- [ ] File path traversal blocked

**Notes:** _______________________________________________

---

## Sign-Off

### Test Summary

| Category | Pass | Fail | Blocked | Notes |
|----------|------|------|---------|-------|
| Onboarding | | | | |
| CLI Workflow | | | | |
| Graph Visualization | | | | |
| Coaching Insights | | | | |
| Knowledge Editing | | | | |
| Focus Page | | | | |
| Cross-Browser | | | | |
| Error Handling | | | | |
| Performance | | | | |
| Security | | | | |

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Beta Launch Decision

- [ ] **GO** - All critical tests pass, minor issues acceptable
- [ ] **NO-GO** - Critical issues must be resolved before launch

**Sign-off Date:** _______________
**Signed By:** _______________

---

## Bug Report Template

When filing bugs, include:

```markdown
**Title:** [Brief description]
**Severity:** Critical / High / Medium / Low
**Category:** [Onboarding | CLI | Dashboard | Graph | Insights | Sync]

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**

**Actual Result:**

**Environment:**
- OS:
- Browser:
- CLI Version:
- Node Version:

**Screenshots/Logs:**
```

---

*Last updated: 2025-12-15*
