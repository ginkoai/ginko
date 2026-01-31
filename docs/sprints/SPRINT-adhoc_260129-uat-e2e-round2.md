# SPRINT: UAT & E2E Testing - Round 2

## Sprint Overview

**Sprint Goal**: Comprehensive manual testing of full Ginko functionality from onboarding through work execution (Round 2 - re-validation after bug fixes)
**Duration**: 1-2 days
**Type**: QA / Validation
**Progress:** 100% (10/10 tasks complete)

**Scope:**
- New user onboarding flow
- Authentication (login/logout)
- Project initialization
- Charter creation
- Epic & Sprint planning
- Task execution workflows
- Dashboard functionality
- Sync & collaboration features

**Success Criteria:**
- [x] All core user journeys tested end-to-end
- [x] Critical bugs documented and prioritized
- [x] Edge cases and error handling validated
- [ ] Dashboard displays accurate data (BUG-007, BUG-010, BUG-013, BUG-016)
- [ ] CLI ↔ Dashboard sync works bidirectionally (BUG-018)

**Previous Round Bugs (Fixed):**
- BUG-003 (HIGH): 40+ duplicate "Team Project" entries in project selector - Fixed
- BUG-004 (CRITICAL): User isolation failure - Fixed

---

## Technical Prerequisites

Before testing, ensure the following environment is set up:

### Terminal Environment

| Platform | Recommended Terminal |
|----------|---------------------|
| **macOS** | Terminal.app (built-in) or iTerm2 |
| **Linux** | Default terminal emulator (GNOME Terminal, Konsole, etc.) |
| **Windows** | [Git Bash](https://gitforwindows.org/) (recommended), [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install), or Windows Terminal with PowerShell |

> **Note for Windows users**: Git Bash provides the most consistent experience with Unix-style commands. WSL2 offers a full Linux environment if needed.

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/downloads) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) (LTS recommended) |
| **Claude Code** | Latest | `npm install -g @anthropic-ai/claude-code` |

### Accounts Required

| Account | Purpose | Setup |
|---------|---------|-------|
| **GitHub** | Source control, collaboration | [github.com/signup](https://github.com/signup) |
| **Anthropic** | Claude Code authentication | [console.anthropic.com](https://console.anthropic.com/) |
| **Ginko** | Dashboard and cloud sync | Created during `ginko init` |

### Optional Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **GitHub CLI** | PR creation, issue management | `brew install gh` or [cli.github.com](https://cli.github.com/) |

### Claude Code Setup

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Login to Claude Code (opens browser)
claude login

# Verify installation
claude --version
```

### Starting a New Project

**Option A: Using create-ginko-project (Recommended)**
```bash
# Interactive project setup with templates
npx create-ginko-project my-project
cd my-project
claude   # Open Claude Code
```

This will:
1. Create project structure with your chosen template (React, Node.js, Library, or Basic)
2. Guide you through Ginko signup at https://app.ginko.ai
3. Configure MCP client with your API key
4. Test the connection to Ginko servers

**Option B: Manual Setup**
```bash
# Create and initialize project
mkdir my-project
cd my-project
git init

# Initialize Ginko (interactive)
npx @ginkoai/cli init

# Or install globally first
npm install -g @ginkoai/cli
ginko init
```

### Verify Setup

```bash
# Check all tools are available
git --version          # Should show 2.30+
node --version         # Should show 18+
claude --version       # Should show latest
ginko --version        # Should show 2.x

# Optional
gh --version           # GitHub CLI if installed
```

---

## Sprint Tasks

### adhoc_260129_s01_t01: Onboarding & Auth Flow
**Priority:** HIGH

**Goal:** Validate new user signup and authentication

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | New user signup with email | Account created, verification email sent | PASS |
| 1.2 | Email verification link | Account verified, redirected to dashboard | PASS |
| 1.3 | Login with valid credentials | Successful login, session created | PASS |
| 1.4 | Login with invalid credentials | Error message, no session | PASS |
| 1.5 | Logout | Session destroyed, redirected to login | PASS |
| 1.6 | Password reset flow | Reset email sent, new password works | PASS |
| 1.7 | Session persistence | Refresh page maintains login | PASS |

**Acceptance Criteria:**
- [x] All auth flows complete without errors
- [x] Error messages are clear and helpful
- [x] Session management works correctly

---

### adhoc_260129_s01_t02: Project Initialization
**Priority:** HIGH

**Goal:** Validate `create-ginko-project` and `ginko init` on a fresh project

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | `npx create-ginko-project my-project` | Project created with template | PASS |
| 2.2 | `.ginko/` directory structure | All expected files present | PASS |
| 2.3 | `CLAUDE.md` generation | Proper project instructions | PASS |
| 2.4 | Graph connection | Project registered in Neo4j | PASS |
| 2.5 | Re-run `ginko init` | Handles existing config gracefully | PASS |
| 2.6 | Init in non-git directory | Appropriate warning/handling | PASS |

**Acceptance Criteria:**
- [x] Fresh project initializes correctly
- [x] Config structure matches spec
- [x] Graph integration works

---

### adhoc_260129_s01_t03: Charter Creation
**Priority:** HIGH

**Goal:** Validate `ginko charter` conversational flow

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | `ginko charter` on new project | Prompts for project info | PASS |
| 3.2 | Answer all charter questions | Charter file generated | PASS |
| 3.3 | Charter file content | All sections populated | PASS |
| 3.4 | Charter syncs to graph | Charter node created | FAIL |
| 3.5 | Re-run `ginko charter` | Option to update or skip | PASS |
| 3.6 | `ginko charter --skip-conversation` | Minimal charter created | PASS |

**Acceptance Criteria:**
- [x] Conversational flow is natural
- [x] Generated charter is useful
- [ ] Graph sync works

---

### adhoc_260129_s01_t04: Epic Planning
**Priority:** HIGH

**Goal:** Validate epic creation workflow

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | `ginko epic` command | Prompts for epic info | PASS |
| 4.2 | Provide epic description | Epic created with ID | PASS |
| 4.3 | Epic file generated | `docs/epics/EPIC-XXX.md` exists | PASS |
| 4.4 | Epic syncs to graph | Epic node with relationships | FAIL |
| 4.5 | List epics | All epics displayed | FAIL |
| 4.6 | Epic with sprint breakdown | Sprints suggested/created | PASS |

**Acceptance Criteria:**
- [x] Epic creation flow works
- [ ] Files and graph in sync
- [x] Sprint suggestions are relevant

---

### adhoc_260129_s01_t05: Sprint Management
**Priority:** HIGH

**Goal:** Validate sprint lifecycle

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | `ginko sprint create` | Conversational sprint creation | FAIL |
| 5.2 | `ginko sprint qf "description"` | Quick-fix task created | N/A (AI-executed) |
| 5.3 | `ginko sprint start <id>` | Sprint activated | N/A (AI-executed) |
| 5.4 | `ginko sprint pause <id>` | Sprint paused, can resume | N/A (AI-executed) |
| 5.5 | `ginko sprint complete <id>` | Sprint marked complete | N/A (AI-executed) |
| 5.6 | Sprint status display | Progress shown correctly | FAIL |
| 5.7 | Sprint with dependencies | Task ordering respected | PASS |

**Acceptance Criteria:**
- [ ] All sprint lifecycle commands work
- [ ] Status transitions are correct
- [ ] Graph reflects sprint state

---

### adhoc_260129_s01_t06: Task Execution
**Priority:** HIGH

**Goal:** Validate task workflow

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | `ginko task start <id>` | Task marked in_progress | N/A (AI-executed) |
| 6.2 | `ginko task complete <id>` | Task marked complete | N/A (AI-executed) |
| 6.3 | `ginko task block <id> "reason"` | Task blocked with reason | N/A (AI-executed) |
| 6.4 | `ginko task pause <id>` | Task returned to not_started | N/A (AI-executed) |
| 6.5 | `ginko log "message"` | Entry added to session log | FAIL |
| 6.6 | `ginko handoff` | Context preserved, clean state | FAIL |
| 6.7 | Complete last task with `--cascade` | Parent sprint auto-completes | N/A (AI-executed) |

**Acceptance Criteria:**
- [ ] Task state transitions work
- [ ] Logging captures work
- [ ] Handoff preserves context

---

### adhoc_260129_s01_t07: Dashboard - Views
**Priority:** MEDIUM

**Goal:** Validate dashboard display functionality

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Project overview page | Shows project summary | PASS |
| 7.2 | Sprint list view | All sprints displayed | PASS (with issues — see BUG-007) |
| 7.3 | Task list view | Tasks with correct status | FAIL |
| 7.4 | Insights page | Coaching metrics shown | FAIL |
| 7.5 | Graph visualization | Nodes and relationships render | PASS |
| 7.6 | Mobile responsive | Views work on mobile | PASS |
| 7.7 | Data refresh | Updates reflect CLI changes | PASS |

**Acceptance Criteria:**
- [ ] All views render correctly
- [x] Data is accurate and current
- [x] Mobile experience is acceptable

---

### adhoc_260129_s01_t08: Dashboard - Interactions
**Priority:** MEDIUM

**Goal:** Validate dashboard interactive features

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 8.1 | Assign task to user | Assignment saved, visible | FAIL |
| 8.2 | Change sprint selection | Active sprint updates | N/A (no sprint selector — navigation via Graph explorer) |
| 8.3 | View team status | Team members and progress shown | FAIL (feature missing) |
| 8.4 | Navigate graph nodes | Click-through works | PASS |
| 8.5 | Filter/search functionality | Results are accurate | PASS |
| 8.6 | Edit sprint/task (if available) | Changes persist | PASS |

**Acceptance Criteria:**
- [ ] Interactive features work
- [x] Changes persist to database
- [x] UI feedback is clear

---

### adhoc_260129_s01_t09: Sync & Collaboration
**Priority:** HIGH

**Goal:** Validate bidirectional sync

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 9.1 | `ginko sync` basic | Pulls unsynced changes | FAIL |
| 9.2 | Dashboard edit → CLI sync | CLI receives dashboard changes | FAIL |
| 9.3 | CLI change → Dashboard | Dashboard reflects CLI work | FAIL |
| 9.4 | Conflict resolution | User prompted for resolution | FAIL (no comparison happens) |
| 9.5 | Team context staleness | Warning shown, auto-sync works | PASS (verified at session start) |
| 9.6 | `ginko team status` | Shows all team members | FAIL |
| 9.7 | Offline/degraded mode | Graceful fallback | N/A (AI requires network) |

**Acceptance Criteria:**
- [ ] Bidirectional sync works
- [ ] Conflicts handled gracefully
- [ ] Team visibility accurate

---

### adhoc_260129_s01_t10: Edge Cases & Error Handling
**Priority:** MEDIUM

**Goal:** Validate error handling and edge cases

**Test Cases:**
| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 10.1 | Invalid task ID | Clear error message | FAIL |
| 10.2 | Network offline | Graceful degradation | N/A (AI requires network) |
| 10.3 | Unauthenticated API call | Proper 401 handling | FAIL |
| 10.4 | Permission denied | Clear error, no data leak | N/A (single team member) |
| 10.5 | Malformed input | Validation error shown | FAIL |
| 10.6 | Concurrent edits | No data corruption | N/A (covered by BUG-018) |
| 10.7 | Large data sets | Performance acceptable | PASS |

**Acceptance Criteria:**
- [ ] Errors are clear and actionable
- [ ] No crashes or data loss
- [ ] Security boundaries enforced

---

## Bug Tracking

| ID | Severity | Area | Description | Status | Reported |
|----|----------|------|-------------|--------|----------|
| BUG-005 | HIGH | CLI/Graph | Entity creation (charter, epic, sprint) does not auto-sync to graph. Requires manual `ginko graph load` to populate. Affects charter, epic, and sprint creation flows. | Open | 2026-01-29 |
| BUG-006 | MEDIUM | CLI | `ginko epic list` returns "No epics found" even though epic doc exists on disk. Epic file not registered in ginko's local config/index. | Open | 2026-01-29 |
| BUG-007 | HIGH | Graph | `ginko graph load` creates duplicate nodes. After loading, 2 epics shown ("e001" and "EPIC-e001: Design Portfolio v1") and duplicate sprint nodes created. Deduplication logic missing or broken. | Open | 2026-01-29 |
| BUG-008 | MEDIUM | CLI/UX | Epics created via `ginko start` menu default to Status: Not Started, Priority Lane: Later. Should default to Status: In Progress, Priority Lane: Now — user is choosing to work on it immediately. | Open | 2026-01-29 |
| BUG-009 | HIGH | CLI/UX | `ginko sprint create` uses raw interactive prompt (`? What are you building? ›`) instead of AI-guided conversational flow. Should follow the reflection pattern used by `ginko charter` and `ginko epic` — Claude asks questions, user responds, AI synthesizes and creates sprint. Breaks in non-TTY environments (e.g., Claude Code). | Open | 2026-01-29 |
| BUG-010 | HIGH | CLI/Graph | Task and sprint status changes (start, complete, pause, block) don't persist visually. `ginko start` and status displays don't reflect updated states. Related to BUG-005 graph sync issue. | Open | 2026-01-29 |
| BUG-011 | HIGH | CLI/Graph | `ginko log` saves locally but fails to sync to graph. Three errors: (1) "No adapters enabled", (2) "Primary adapter 'graph' registered but not enabled", (3) Graph API 404 on POST to events endpoint. Events endpoint misconfigured or not set up for project namespace. `ginko graph load` uses a different endpoint and works. | Open | 2026-01-29 |
| BUG-012 | HIGH | CLI/UX | `ginko handoff` uses interactive arrow-key prompt for untracked work reconciliation. AI-executed commands must not use interactive prompts — needs `--yes` or `--skip` flag, or should default to non-interactive when not in a TTY. | Open | 2026-01-29 |
| BUG-013 | MEDIUM | Dashboard | Insights page shows "No Insights Available" even though `ginko insights --json` generates full data locally (score 73/100 with categories). Insights data not synced to or read by dashboard. | Open | 2026-01-29 |
| BUG-014 | MEDIUM | Dashboard | Dashboard does not persist last-accessed project. On refresh, always loads first project alphabetically (or by creation order) instead of the most recently viewed project. User expects uat-project to persist but gets existing-project every time. | Open | 2026-01-29 |
| BUG-015 | MEDIUM | Dashboard | Task assignee field is freeform text input instead of a dropdown listing the project's team members. Assignment saves but UX is error-prone (typos, inconsistent names). | Open | 2026-01-29 |
| BUG-016 | MEDIUM | CLI/Graph | Tasks are not auto-assigned to the user when work begins (`ginko task start`). Completed tasks/sprints also show status "Todo" on dashboard instead of "Done" — related to BUG-010. | Open | 2026-01-29 |
| BUG-017 | LOW | Dashboard | No team status view on dashboard. `ginko team status` works in CLI but has no dashboard equivalent. Feature gap. | Open | 2026-01-29 |
| BUG-018 | CRITICAL | CLI/Sync | Bidirectional sync is broken. `ginko sync` (dashboard→local) reports "All nodes are synced" even when dashboard edits exist — never pulls content changes to local files. `ginko graph load` (local→graph) overwrites dashboard edits without comparison. No conflict detection or merge logic exists. The two commands operate as independent one-way pushes with no diffing. | Open | 2026-01-29 |
| BUG-019 | MEDIUM | CLI | `ginko graph load` reports "No new content since last load" even when file content has changed. Likely using file modification time or hash that doesn't detect edits, yet the content does get pushed to the graph successfully. Misleading CLI output. | Open | 2026-01-29 |
| BUG-020 | HIGH | CLI/Graph | `ginko team status` shows "No team members with assigned work" even after assigning tasks via `ginko assign`. Assigned tasks visible on dashboard but team status command doesn't detect them. | Open | 2026-01-29 |
| BUG-021 | HIGH | CLI/Auth | Identity mismatch: `ginko login` authenticates as API user (e.g., chris@ginkoai.com) but local config retains a different user.email (e.g., xtophr@gmail.com). `ginko login` should update local config to match authenticated identity, or link the two. Causes insights to report against wrong user, session directories named with wrong email. | Open | 2026-01-29 |
| BUG-022 | MEDIUM | CLI | No client-side validation for empty/malformed task IDs. `ginko task start ""` sends request to `/task//status` which returns HTML 404 parsed as JSON. Should validate input before API call. | Open | 2026-01-29 |

---

## Regression Check

Verify previously fixed bugs remain fixed:

| Bug | Check | Pass/Fail |
|-----|-------|-----------|
| BUG-003 | Project selector shows only valid projects (no duplicates) | PASS |
| BUG-004 | User isolation - no cross-user data leakage | PASS |

---

## Notes

- Test with fresh user account where possible
- Document exact reproduction steps for bugs
- Note any UX friction points even if not bugs
- Take screenshots for visual issues
- This is Round 2 - pay special attention to areas where BUG-003 and BUG-004 were found

---

## Completion Criteria

Sprint is complete when:
1. All 10 task areas have been tested
2. Critical/high bugs documented
3. Test results summarized
4. Prioritized bug list created for follow-up
5. Regression checks pass for BUG-003 and BUG-004
