# SPRINT: Manual UAT & E2E Testing

## Sprint Overview

**Sprint Goal**: Comprehensive manual testing of full Ginko functionality from onboarding through work execution
**Duration**: 1-2 days
**Type**: QA / Validation
**Progress:** 0% (0/10 tasks complete)

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
- [ ] All core user journeys tested end-to-end
- [ ] Critical bugs documented and prioritized
- [ ] Edge cases and error handling validated
- [ ] Dashboard displays accurate data
- [ ] CLI ↔ Dashboard sync works bidirectionally

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

### adhoc_260126_s02_t01: Onboarding & Auth Flow (1h)
**Priority:** HIGH

**Goal:** Validate new user signup and authentication

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 1.1 | New user signup with email | Account created, verification email sent |
| 1.2 | Email verification link | Account verified, redirected to dashboard |
| 1.3 | Login with valid credentials | Successful login, session created |
| 1.4 | Login with invalid credentials | Error message, no session |
| 1.5 | Logout | Session destroyed, redirected to login |
| 1.6 | Password reset flow | Reset email sent, new password works |
| 1.7 | Session persistence | Refresh page maintains login |

**Acceptance Criteria:**
- [ ] All auth flows complete without errors
- [ ] Error messages are clear and helpful
- [ ] Session management works correctly

---

### adhoc_260126_s02_t02: Project Initialization (1h)
**Priority:** HIGH

**Goal:** Validate `ginko init` on a fresh project

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 2.1 | `ginko init` on new project | Config files created |
| 2.2 | `.ginko/` directory structure | All expected files present |
| 2.3 | `CLAUDE.md` generation | Proper project instructions |
| 2.4 | Graph connection | Project registered in Neo4j |
| 2.5 | Re-run `ginko init` | Handles existing config gracefully |
| 2.6 | Init in non-git directory | Appropriate warning/handling |

**Acceptance Criteria:**
- [ ] Fresh project initializes correctly
- [ ] Config structure matches spec
- [ ] Graph integration works

---

### adhoc_260126_s02_t03: Charter Creation (1h)
**Priority:** HIGH

**Goal:** Validate `ginko charter` conversational flow

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 3.1 | `ginko charter` on new project | Prompts for project info |
| 3.2 | Answer all charter questions | Charter file generated |
| 3.3 | Charter file content | All sections populated |
| 3.4 | Charter syncs to graph | Charter node created |
| 3.5 | Re-run `ginko charter` | Option to update or skip |
| 3.6 | `ginko charter --skip-conversation` | Minimal charter created |

**Acceptance Criteria:**
- [ ] Conversational flow is natural
- [ ] Generated charter is useful
- [ ] Graph sync works

---

### adhoc_260126_s02_t04: Epic Planning (1h)
**Priority:** HIGH

**Goal:** Validate epic creation workflow

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 4.1 | `ginko epic` command | Prompts for epic info |
| 4.2 | Provide epic description | Epic created with ID |
| 4.3 | Epic file generated | `docs/epics/EPIC-XXX.md` exists |
| 4.4 | Epic syncs to graph | Epic node with relationships |
| 4.5 | List epics | All epics displayed |
| 4.6 | Epic with sprint breakdown | Sprints suggested/created |

**Acceptance Criteria:**
- [ ] Epic creation flow works
- [ ] Files and graph in sync
- [ ] Sprint suggestions are relevant

---

### adhoc_260126_s02_t05: Sprint Management (1.5h)
**Priority:** HIGH

**Goal:** Validate sprint lifecycle

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 5.1 | `ginko sprint create` | Conversational sprint creation |
| 5.2 | `ginko sprint qf "description"` | Quick-fix task created |
| 5.3 | `ginko sprint start <id>` | Sprint activated |
| 5.4 | `ginko sprint pause <id>` | Sprint paused, can resume |
| 5.5 | `ginko sprint complete <id>` | Sprint marked complete |
| 5.6 | Sprint status display | Progress shown correctly |
| 5.7 | Sprint with dependencies | Task ordering respected |

**Acceptance Criteria:**
- [ ] All sprint lifecycle commands work
- [ ] Status transitions are correct
- [ ] Graph reflects sprint state

---

### adhoc_260126_s02_t06: Task Execution (1.5h)
**Priority:** HIGH

**Goal:** Validate task workflow

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 6.1 | `ginko task start <id>` | Task marked in_progress |
| 6.2 | `ginko task complete <id>` | Task marked complete |
| 6.3 | `ginko task block <id> "reason"` | Task blocked with reason |
| 6.4 | `ginko task pause <id>` | Task returned to not_started |
| 6.5 | `ginko log "message"` | Entry added to session log |
| 6.6 | `ginko handoff` | Context preserved, clean state |
| 6.7 | Complete last task with `--cascade` | Parent sprint auto-completes |

**Acceptance Criteria:**
- [ ] Task state transitions work
- [ ] Logging captures work
- [ ] Handoff preserves context

---

### adhoc_260126_s02_t07: Dashboard - Views (1h)
**Priority:** MEDIUM

**Goal:** Validate dashboard display functionality

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 7.1 | Project overview page | Shows project summary |
| 7.2 | Sprint list view | All sprints displayed |
| 7.3 | Task list view | Tasks with correct status |
| 7.4 | Insights page | Coaching metrics shown |
| 7.5 | Graph visualization | Nodes and relationships render |
| 7.6 | Mobile responsive | Views work on mobile |
| 7.7 | Data refresh | Updates reflect CLI changes |

**Acceptance Criteria:**
- [ ] All views render correctly
- [ ] Data is accurate and current
- [ ] Mobile experience is acceptable

---

### adhoc_260126_s02_t08: Dashboard - Interactions (1h)
**Priority:** MEDIUM

**Goal:** Validate dashboard interactive features

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 8.1 | Assign task to user | Assignment saved, visible |
| 8.2 | Change sprint selection | Active sprint updates |
| 8.3 | View team status | Team members and progress shown |
| 8.4 | Navigate graph nodes | Click-through works |
| 8.5 | Filter/search functionality | Results are accurate |
| 8.6 | Edit sprint/task (if available) | Changes persist |

**Acceptance Criteria:**
- [ ] Interactive features work
- [ ] Changes persist to database
- [ ] UI feedback is clear

---

### adhoc_260126_s02_t09: Sync & Collaboration (1h)
**Priority:** HIGH

**Goal:** Validate bidirectional sync

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 9.1 | `ginko sync` basic | Pulls unsynced changes |
| 9.2 | Dashboard edit → CLI sync | CLI receives dashboard changes |
| 9.3 | CLI change → Dashboard | Dashboard reflects CLI work |
| 9.4 | Conflict resolution | User prompted for resolution |
| 9.5 | Team context staleness | Warning shown, auto-sync works |
| 9.6 | `ginko team status` | Shows all team members |
| 9.7 | Offline/degraded mode | Graceful fallback |

**Acceptance Criteria:**
- [ ] Bidirectional sync works
- [ ] Conflicts handled gracefully
- [ ] Team visibility accurate

---

### adhoc_260126_s02_t10: Edge Cases & Error Handling (1h)
**Priority:** MEDIUM

**Goal:** Validate error handling and edge cases

**Test Cases:**
| # | Test | Expected Result |
|---|------|-----------------|
| 10.1 | Invalid task ID | Clear error message |
| 10.2 | Network offline | Graceful degradation |
| 10.3 | Unauthenticated API call | Proper 401 handling |
| 10.4 | Permission denied | Clear error, no data leak |
| 10.5 | Malformed input | Validation error shown |
| 10.6 | Concurrent edits | No data corruption |
| 10.7 | Large data sets | Performance acceptable |

**Acceptance Criteria:**
- [ ] Errors are clear and actionable
- [ ] No crashes or data loss
- [ ] Security boundaries enforced

---

## Bug Tracking

| ID | Severity | Area | Description | Status |
|----|----------|------|-------------|--------|
| | | | | |

---

## Notes

- Test with fresh user account where possible
- Document exact reproduction steps for bugs
- Note any UX friction points even if not bugs
- Take screenshots for visual issues

---

## Completion Criteria

Sprint is complete when:
1. All 10 task areas have been tested
2. Critical/high bugs documented
3. Test results summarized
4. Prioritized bug list created for follow-up
