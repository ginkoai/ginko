# Ginko Development Guide

## Team Development Context

**Ginko** is a git-native CLI for intelligent context management in AI-assisted development.

### Quick Start
```bash
ginko start                    # Begin/resume session (< 2s startup)
ginko log "description"        # Log insights (defensive logging)
ginko sync                     # Pull dashboard edits to local git
ginko handoff "summary"        # Optional session handoff
ginko charter                  # Create project charter (AI-mediated)
ginko epic                     # Create epic with sprints (AI-mediated)

# Task status management (graph-authoritative)
ginko task start <id>          # Start working on task
ginko task complete <id>       # Mark task complete
ginko task block <id>          # Mark task blocked
```

### AI Assistant Instructions

**🚨 CRITICAL: Single-Word Command Execution**

When the user types a **single word** that matches a ginko command (`start`, `handoff`, `log`, `status`, etc.), **IMMEDIATELY** execute the corresponding ginko command without ANY preamble, explanation, or delay.

**Pattern Recognition:**
- User input: `start` → Execute: `ginko start`
- User input: `handoff` → Execute: `ginko handoff`
- User input: `status` → Execute: `ginko status`
- User input: `sync` → Execute: `ginko sync`
- User input: `log` → Ask for description, then execute
- User input: `charter` → Execute: `ginko charter`, then guide conversation
- User input: `epic` → Execute: `ginko epic`, then guide conversation

**DO NOT:**
- Announce what you're about to do
- Explain the command first
- Ask for confirmation
- Add any commentary before execution
- Wait for additional input

**Correct response to "start":**
```
[Execute: ginko start]
[Output table as code block in response]
AI: What would you like to work on?
```

**Incorrect response to "start":**
```
I'll start a Ginko session for you.
[9 second delay]
[Executes: ginko start]
```

**Why this matters:** Eliminates 9+ seconds of assistant response latency, reducing startup from 28s to <2s.

---

**🎯 ONBOARDING: New Project Setup Flow**

When working with a **newly initialized project** (fresh `ginko init`, no charter exists), proactively guide the user through onboarding:

**Detection:**
- Project has `.ginko/` directory (ginko initialized)
- No `docs/PROJECT-CHARTER.md` file exists
- User is in early stages (few/no commits, minimal files)

**Action Sequence:**
1. **After first `ginko start`**, check for charter
2. **If no charter exists**, proactively suggest:
   ```
   I notice this is a new project without a charter. Would you like to create one?

   A charter helps us:
   - Align on project goals and scope
   - Define success criteria
   - Guide development decisions

   We can create it with: ginko charter
   ```
3. **If user agrees:**
   - Execute: `ginko charter` (outputs AI-mediated template)
   - Read the template output carefully - it contains questions, guidelines, examples
   - Conduct natural conversation with user (not mechanical questions)
   - Offer insights from your knowledge
   - Adapt based on their responses
   - Synthesize responses into well-formed charter
   - Create `docs/PROJECT-CHARTER.md` with proper format
4. **After charter created**, briefly summarize key sections and confirm next steps

**Example interaction:**
```
User: start
AI: [Executes ginko start immediately]
[Table displays with "New project" indicator]
AI: I notice this is a new project without a charter. Would you like to create one?
    This will help us align on goals and scope.

User: yes
AI: [Executes: ginko charter, reads template]
AI: Great! Let's capture your project vision.
    What problem are you solving? What would you like to build?

User: [describes project]
AI: [Asks follow-up questions naturally based on template guidance]
AI: [Synthesizes responses into charter]
AI: Charter created at docs/PROJECT-CHARTER.md

    Key sections:
    - Purpose: [summarize]
    - Success criteria: [list 2-3 top items]

    What would you like to work on first?
```

**Important:**
- Only suggest charter ONCE per project (check if `docs/PROJECT-CHARTER.md` exists)
- Don't be pushy - accept "no" gracefully
- Use AI-mediated approach (default) - natural conversation guided by template
- Human users can run `ginko charter --no-ai` for interactive CLI mode
- After charter is created, reference it naturally during development

**After Execution: Display Table as Code Block**

Claude Code collapses long bash output. To ensure the table is visible, **output it as a code block in your response**.

**Correct behavior:**
```
[Run ginko start, capture output]
[Display table as markdown code block in response]
AI: What would you like to work on?
```

**Example:**
~~~
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ginko     Ready │ Hot (10/10) │ Think & Build                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Sprint: Graph Explorer v2 Sprint 1                       0% [t01/7]    │
│  Next: e011_s01_t01 - Refactor Nav Tree (continue)                      │
│  Branch: main (5 uncommitted) │ ⚠️ Blocked: ...                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ginko.ai                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```
What would you like to work on?
~~~

**Guidelines:**
- Run `ginko start` via Bash tool
- Copy the table output into a markdown code block in your response
- Add a single follow-up line: "What would you like to work on?"
- Do NOT repeat the table info in prose - the code block IS the display

**🔄 AUTO-SYNC: Staleness Warning Response**

When `ginko start` shows a staleness warning, **automatically run `ginko sync`** to pull team context:

**Detection:**
```
🚨 Team context is critically stale
   Never synced - team context not loaded

   Run `ginko sync` to pull team updates.
```

**Action:** Immediately run `ginko sync` without asking the user.

**Example flow:**
```
[ginko start output shows staleness warning]
AI: Team context is stale. Syncing now...
[Executes: ginko sync]
AI: ✓ Team context updated. Ready to work.
```

**Why auto-sync:**
- Staleness means the AI is missing team knowledge (patterns, ADRs, gotchas)
- Fresh context improves AI decision quality
- User shouldn't need to manually sync - the AI handles it

**Thresholds:**
- `🚨 Critical` (never synced or >7 days): Always auto-sync
- `⚠️ Warning` (1-7 days stale): Auto-sync at session start
- No warning: Context is fresh, no action needed

---

## Autonomous Development Mode

**Edit Permission**: Auto-accept enabled. Proceed with edits autonomously.

**Decision Framework**:
- ✅ **Proceed autonomously**: Implementation details, code style, file organization, refactoring, bug fixes
- ⏸️ **Ask first**: Architecture changes, breaking API changes, new external dependencies, significant scope expansion
- 🤔 **Use judgment**: If confidence > 80%, proceed. If confidence < 80%, ask for clarification.

**Collaboration Style**:
- Work at full speed with concise progress updates
- Only interrupt for genuine ambiguity or meaningful risk
- Trust established: 2025-11-21

### Subagent Usage for Acceleration

**When to use subagents** (via Task tool):
- ✅ **Parallel work**: Launch multiple subagents simultaneously for independent tasks
- ✅ **Exploration**: Use `Explore` agent for codebase discovery, pattern finding
- ✅ **Complex multi-step tasks**: Delegate to specialized agents (general-purpose, Plan)
- ✅ **Documentation lookup**: Use claude-code-guide for Claude Code/SDK questions

**Best practices**:
- Launch subagents in parallel when tasks are independent (single message, multiple Task calls)
- Be specific with prompts - agents run autonomously and return once
- Use appropriate thoroughness levels for Explore agent (quick/medium/very thorough)
- Trust agent outputs - they're designed for accuracy

**Example parallel execution**:
```typescript
// Instead of sequential:
// 1. Read file A, 2. Read file B, 3. Read file C
// Do parallel:
[Task(explore pattern X), Task(explore pattern Y), Task(explore pattern Z)]
```

### Branch Strategy (Team Development)

**For teams up to 10 members**, use branches to prevent merge conflicts on shared files:

| File Type | Branch Required? | Rationale |
|-----------|------------------|-----------|
| Code (`packages/*`, `src/*`) | ✅ Always | Prevents conflicts, enables review |
| Shared docs (ADRs, sprints, PRDs) | ✅ Always | Multiple editors likely |
| Shared context (`.ginko/context/*`) | ✅ Always | Team knowledge, high conflict risk |
| Session files (`.ginko/sessions/{user}/*`) | ❌ No | Already user-isolated |
| Trivial fixes (typos, single-line) | ⚡ Judgment | Direct OK if obvious and safe |

**Workflow:**
```bash
# Start feature work
git checkout -b {user}/{epic-or-feature}  # e.g., chris/e012-web-gui

# Regular commits on branch
git add . && git commit -m "Description"

# When ready, push and create PR
git push -u origin HEAD
gh pr create --title "Feature: description" --body "..."

# After review, merge via GitHub (squash or merge commit)
```

**PR Guidelines:**
- Keep PRs focused (one feature/fix per PR)
- Request review from active team members
- Resolve conflicts before merging
- Delete branch after merge

**Exception:** During solo sessions with no other active team members, direct-to-main is acceptable for low-risk changes. When in doubt, branch.

---

### Context Loading
Context loads automatically via event-based streaming (ADR-043):
- Session cursor: `.ginko/sessions/[user]/cursors.json`
- Event stream: `.ginko/sessions/[user]/current-events.jsonl`
- Session logs: `.ginko/sessions/[user]/current-session-log.md`
- Archives: `.ginko/sessions/[user]/archive/`

### Development Philosophy
Always prioritize:
1. **⚡ AI-optimized file discovery** - `head -12 filename.ts` for instant context (ADR-002)
2. Understanding existing code before implementing changes
3. Following established team patterns and conventions
4. Testing changes before committing
5. Writing self-documenting, maintainable code
6. Handling errors gracefully with meaningful messages

---

## 🧠 Context Reflexes - Automatic Thought Patterns

Activate these reflexes naturally during work (not mechanical checklists):

### Core Reflexes

**1. "Proactive Logging" 📝 (ADR-034)**
- **Triggers:** After fixes, features, decisions, insights, git ops, achievements
- **Minimum:** 3+ events per session (at least 1 per 20 min of active work)
- **Before commits:** Always log what's being committed and why
- Use `ginko log` with context-rich descriptions
- **Quality standard:** Write for fresh AI with zero context (WHAT + WHY + HOW)

**2. "Why Am I Doing This?" ⏰**
- **Triggers:** Every 30 min, before major edits/commits
- Trace current work back to its purpose

**3. "Have We Done This Before?" 🔍**
- **Triggers:** Before implementing new functionality
- Recall similar patterns from context

**4. "Something Feels Off" 🤔**
- **Triggers:** Confidence < 60%, velocity slower than expected
- Identify impediments and seek clarification

**5. "Update My Understanding" 💡**
- **Triggers:** After solving problems or discovering patterns
- Note learnings for future reference

**6. "Is This Worth It?" 💰**
- **Triggers:** Before significant implementation
- Question: Is complexity worth the value delivered?

**7. "User Impact Check" 👤**
- **Triggers:** After each implementation step
- Question: How does this help achieve the user's goal?

**8. "Health Monitor" 🏥**
- **Triggers:** Every 15-30 min, before commits, after changes
- Validate tests pass, builds work, nothing broken

**9. "Track This Work" 📊 (ADR-052)**
- **Triggers:** Work begins outside current sprint scope, bug fixes emerge, system maintenance needed
- **Detection:** Editing files not referenced in current task, scope expanding beyond sprint
- **Action:** Prompt user to create ad-hoc task for observability
- **Script:** "This work is outside our current sprint. Shall I create an ad-hoc task to track it?"
- **Flow preservation:** Single lightweight question, proceed if declined (note in session log)
- **Anti-pattern:** Untracked work breaks traceability for future collaborators

#### Reflex Sensitivity by Work Mode
- **Hack & Ship:** Less frequent, focus on speed
- **Think & Build:** Balanced, pattern-aware (default)
- **Full Planning:** Frequent, strict hierarchy checking

---

## Answering Project Questions (EPIC-003)

When users ask factual questions about the project, use ginko CLI commands to query the knowledge graph.

### Graph Commands (Preferred)

**Setup:** Run `ginko login` and `ginko graph init` once to authenticate and initialize.

**Semantic search** - finds content similar to query:
```bash
ginko graph query "authentication patterns"
ginko graph query "error handling" --limit 10
```

**Explore document connections:**
```bash
ginko graph explore ADR-039          # View document and its connections
ginko graph explore e008_s04_t01     # Explore task relationships
```

**Check graph health and statistics:**
```bash
ginko graph status                   # Node counts, relationships, health
ginko graph health                   # API reliability metrics
```

**Task and sprint management:**
```bash
ginko assign e008_s04_t01 user@example.com           # Assign single task
ginko assign --sprint e008_s04 --all user@example.com # Assign all tasks in sprint
ginko sync                                            # Pull dashboard changes to local
ginko sync --type ADR                                 # Sync only ADRs
```

### Local Files (Fallback when graph unavailable)

| Question Type | File Location |
|--------------|---------------|
| Sprint progress | Graph via `ginko start` (authoritative) |
| Sprint documentation | `docs/sprints/SPRINT-*.md` (narrative details) |
| Architecture decisions | `docs/adr/ADR-*.md` |
| Project goals | `docs/PROJECT-CHARTER.md` |
| Recent activity | `.ginko/sessions/[user]/current-events.jsonl` |
| Session logs | `.ginko/sessions/[user]/current-session-log.md` |

### Common Query Recipes

**"What's our sprint progress?"**
→ Use `ginko start` to see current progress, or query the graph:
```bash
# Via ginko start (shows progress in header)
ginko start

# Via graph query
ginko graph query "current sprint progress"
```

**"How do we handle X?" / "What's our approach to X?"**
→ `ginko graph query "X"` OR local: `grep -l -i "X" docs/adr/*.md`

**"What is [person] working on?"**
→ `ginko graph query "person activity"` OR: `grep -i "person" .ginko/sessions/*/current-session-log.md`

**"Show me ADRs about [topic]"**
→ `ginko graph query "topic" --type ADR` OR: `grep -l -i "topic" docs/adr/*.md`

---

## Syncing Knowledge (ADR-054)

Pull dashboard edits back to local git with `ginko sync`:

```bash
ginko sync                     # Pull all unsynced knowledge edits
ginko sync --dry-run           # Preview changes without applying
ginko sync --type ADR          # Sync only ADRs
ginko sync --type Pattern      # Sync only Patterns
ginko sync --force             # Overwrite local files with graph versions
ginko sync --no-commit         # Sync files but don't auto-commit
```

**Supported node types:** ADR, PRD, Pattern, Gotcha, Charter, Sprint

**Workflow:**
1. Edit knowledge nodes in the dashboard (https://app.ginkoai.com)
2. Run `ginko sync` to pull changes to local markdown files
3. Changes are auto-committed with descriptive messages
4. Local files stay in sync with the graph

---

## Required: AI-Optimized File Discovery (ADR-002)

Our codebase uses standardized frontmatter for **70% faster** context discovery:

```bash
# Get instant file context (0.1s vs minutes of reading)
head -12 path/to/file.ts

# Find files by functionality
find . -name "*.ts" | xargs grep -l "@tags:.*auth"

# Find related files
grep -l "@related.*filename" **/*.ts

# Assess complexity before diving in
find . -name "*.ts" | xargs grep -l "@complexity: high"
```

### MANDATORY: Frontmatter for All New Files

**ALWAYS add frontmatter when creating any TypeScript/JavaScript file:**

```typescript
/**
 * @fileType: [component|page|api-route|hook|utility|provider|model|config|command]
 * @status: current
 * @updated: YYYY-MM-DD
 * @tags: [relevant, keywords, for, search]
 * @related: [connected-file.ts, related-component.tsx]
 * @priority: [critical|high|medium|low]
 * @complexity: [low|medium|high]
 * @dependencies: [external-packages, local-modules]
 */
```

**Benefits:**
- 🔍 Instant context: `head -12` reveals purpose in 0.1 seconds
- 🎯 Smart search: Find files by function, not filename
- 🧠 AI optimization: Better context for development decisions
- 🚀 Team velocity: 70% faster file discovery

---

## Entity Naming Convention (ADR-052)

All graph entities use a hierarchical, sortable naming convention:

### Standard Format

| Entity | Format | Example |
|--------|--------|---------|
| Epic | `e{NNN}` | `e005` |
| Sprint | `e{NNN}_s{NN}` | `e005_s01` |
| Task | `e{NNN}_s{NN}_t{NN}` | `e005_s01_t01` |

### Ad-hoc Work (unplanned sprints/tasks)

```
adhoc_{YYMMDD}_s{NN}_t{NN}
```

**Examples:**
- `adhoc_251209_s01` - Ad-hoc sprint created Dec 9, 2025
- `adhoc_251209_s01_t01` - First task in that sprint

### When to Create Ad-hoc Tasks

Create ad-hoc tasks for:
- Bug fixes discovered mid-session
- System maintenance work
- Scope creep that needs tracking
- Exploratory work that produces artifacts

**Prompt user:** "This work is outside our current sprint. Shall I create an ad-hoc task to track it?"

### Padding Rules

- Epics: 3 digits (max 999)
- Sprints: 2 digits (max 99 per epic)
- Tasks: 2 digits (max 99 per sprint)

**Soft limits:** Warn if sprint > 20 tasks or epic > 10 sprints.

---

## Sprint Progress Tracking (Graph-Authoritative)

**IMPORTANT:** Task status is now managed via CLI commands, NOT markdown checkboxes. The knowledge graph is the single source of truth for task status.

### Task Status Commands

Use these CLI commands to update task status:

```bash
ginko task start <id>          # Mark task as in_progress
ginko task complete <id>       # Mark task as completed
ginko task block <id>          # Mark task as blocked
```

**Examples:**
```bash
ginko task start e015_s03_t02      # Starting work on task
ginko task complete e015_s03_t02   # Task finished
ginko task block e015_s03_t02      # Hit a blocker
```

### When to Update Task Status
- **Start of work:** `ginko task start <id>` when beginning a task
- **Task completion:** `ginko task complete <id>` after finishing work
- **Blockers discovered:** `ginko task block <id>` when stuck
- **Before commits:** Always update status before committing related work

### Progress Display

Sprint progress is displayed automatically by `ginko start`:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Sprint: EPIC-015 Sprint 3                              43% [t03/7]    │
│  Next: e015_s03_t04 - Implement task command (continue)                │
└─────────────────────────────────────────────────────────────────────────┘
```

Progress percentage comes from the graph (completed tasks / total tasks).

### Legacy: Checkbox Format (Deprecated)

**Note:** Checkbox syntax in markdown files is now legacy and ignored by the system.

Old format (no longer used for status):
```markdown
- [x] Completed task (legacy)
- [@] In progress (legacy)
- [ ] Pending (legacy)
```

These checkboxes may still appear in older sprint files but are not authoritative. The graph status (managed via `ginko task` commands) is the source of truth.

### Sprint Documentation

Sprint files (`docs/sprints/SPRINT-*.md`) remain useful for:
- **Accomplishments:** Narrative descriptions of completed work
- **Technical notes:** Implementation details, decisions made
- **Blockers:** Detailed context about what's blocking progress

**Example accomplishment entry:**
```markdown
## Accomplishments This Sprint

### 2025-01-15: Task Command Implementation
- Implemented `ginko task` command for graph-authoritative status updates
- Root cause of sync issues: local file status conflicting with graph
- Solution: Graph becomes single source of truth
- Files: packages/cli/src/commands/task/task.ts
```

### Workflow Pattern

**After completing work:**
```bash
# 1. Mark the task complete in the graph
ginko task complete e015_s03_t04

# 2. Log the achievement
ginko log "Completed task command implementation. Graph is now authoritative for task status." \
  --category=feature --impact=high

# 3. Commit your code changes
git add .
git commit -m "feat(task): Implement graph-authoritative task status"
```

### Integration with Session Logging

Task status and session logging work together:
- **Task status** (`ginko task`) - Quick status updates to the graph
- **Session logs** (`ginko log`) - Detailed chronology (WHAT + WHY + HOW)
- Both provide full visibility for team members and future sessions

---

## Session Logging (ADR-033)

**Purpose:** Continuous logging captures insights at low context pressure (20-80%), enabling high-quality handoffs even when called at 95%+ pressure.

### When to Log

Log after significant events:
1. **Fixes** - Root cause identified, solution applied
2. **Features** - New functionality added
3. **Decisions** - Architecture choices, alternatives considered
4. **Insights** - Patterns, gotchas, optimizations discovered
5. **Git ops** - Commits, merges, branch changes
6. **Achievements** - Milestones reached, tests passing

**Frequency Targets:**
- **Minimum:** 3 events per session (non-negotiable baseline)
- **Target:** 5-10 events per session (Think & Build mode)
- **Hack & Ship:** 2-3 events minimum
- **Deep Work/Full Planning:** 8-15 events

**Session Health Check:** If ending session with < 3 logged events, log a summary event capturing what was worked on, key decisions, and next steps.

### Logging Checkpoints (Mandatory)

These checkpoints ensure consistent logging volume:

**Session Start (within first 15 min):**
- Log initial context: what task you're starting, approach planned
- Example: `ginko log "Starting e008_s04_t02: Stripe product configuration. Will create per-seat subscription product." --category=feature`

**Before Every Git Commit:**
- Mark completed tasks: `ginko task complete <id>`
- Log what's being committed and why (captures intent, not just diff)
- This is the most important checkpoint - never skip it
- Example: `ginko log "Implementing seat-based billing. Added seat_count tracking, prorated upgrade support." --category=feature --impact=high`

**After Task Completion:**
- Mark task complete: `ginko task complete <id>`
- Log completion with key decisions and learnings

**Every 30 Minutes (Active Work):**
- Checkpoint: "What have I done that should be logged?"
- If nothing logged yet, log current progress or blockers

**On Blockers/Discoveries:**
- Log immediately when hitting blockers or discovering gotchas
- These insights are most valuable when fresh

### Quality Standard: "Fresh Session Test"

Write for an AI with **ZERO context** about your session. Include WHAT + WHY + HOW.

**Good example:**
```bash
ginko log "Fixed EventQueue timer keeping ginko start process alive indefinitely. Root cause: setInterval at event-queue.ts:82 kept Node.js event loop alive. Solution: Added .unref() to allow clean exit. Reduced startup from 90s to 2s." \
  --category=fix --impact=high --files="packages/cli/src/lib/event-queue.ts:89"
```

**Bad example:**
```bash
ginko log "Fixed startup issue" --category=fix
```

### Integration with Reflexes

Logging integrates with the "Proactive Logging" reflex (#1):
- Log proactively after significant events (don't wait for "perfect" moment)
- Brief confirmation after logging: "Logged: [category] - [one-line summary]"
- Prioritize pre-commit logging (most important checkpoint)
- Captures context when quality is optimal

**Full guide:** [ADR-033 Implementation Guide](docs/adr/ADR-033-implementation-guide.md)

---

## Development Methodology

**INVENTORY → CONTEXT → THINK → PLAN → PRE-MORTEM → VALIDATE → ACT → TEST → RETROSPECTIVE**

### Step 0: INVENTORY - What Already Exists

Before building, check what's there:
```bash
# AI-optimized discovery
head -12 $(find . -name "*.ts" | head -5)  # Check frontmatter
find . -name "*similar-feature*" -type f
grep -r "pattern-you-need" --include="*.ts"
ls -la relevant/directory/
```

### Pre-Mortem Questions
1. "What if the obvious solution doesn't work?"
2. "What are we assuming that might be false?"
3. "If this fails spectacularly, what was the cause?"
4. "What's the stupid thing that will break this?"

### Success Definition Formula
```
Success = Specific Metric + Target Value + Time Boundary + Acceptance Criteria
```

**Example:** "Reduce npm HIGH vulnerabilities to zero by end of sprint without breaking functionality"

**Full methodology:** See `/docs/PLANNING-TEMPLATE.md` and `/docs/CONTEXT-GATHERING-CHECKLIST.md`

---

## Collaboration Patterns

### The "Vibecheck" Pattern 🎯

When sensing drift, frustration, or misalignment, call for a **vibecheck**:

**Purpose:** Gentle recalibration to reset direction

**When to use:**
- Feeling lost or confused about direction
- Noticing repeated failed attempts
- Sensing frustration
- Major scope creep
- Working on something that feels wrong

**How it works:**
1. Call it: "I think we need a vibecheck"
2. Pause current work
3. Quick sync: "What are we actually trying to achieve?"
4. Realign on clear next steps
5. Continue with fresh perspective

**Key principles:**
- Non-judgmental (no blame)
- Quick (30-60 seconds)
- Mutual (either collaborator can call)
- Productive (always ends with clear action)

---

## Workspace-Specific Development

### 🚀 Monorepo Structure

This is a monorepo with specialized packages:

**Core Packages:**
- `packages/cli/` - Ginko CLI (git-native session management)
- `packages/mcp-server/` - MCP server implementation
- `packages/claude-sdk/` - Claude SDK integration
- `packages/shared/` - Shared utilities

**Workspace-Specific Guides:**
- CLI development → See `packages/cli/README.md`
- MCP server → See `packages/mcp-server/README.md`
- SDK integration → See `packages/claude-sdk/README.md`

### Build & Test
```bash
npm run build              # Build all packages
npm run build:cli          # Build CLI only
npm test                   # Run all tests
npm run test:cli           # Test CLI only
```

### Deploy Dashboard to Vercel

**IMPORTANT:** Always run Vercel commands from the **monorepo root** (`/Users/cnorton/Development/ginko`), NOT from the dashboard directory. The Vercel project is configured at the monorepo level.

```bash
# From monorepo root - deploy to production
cd /Users/cnorton/Development/ginko && vercel --prod --yes

# Preview deployment
cd /Users/cnorton/Development/ginko && vercel --yes

# Check deployment status
vercel ls
```

**Production URL:** https://app.ginkoai.com

---

## Project Architecture

### Ginko CLI (Primary)
- **Event-based context loading** - Sub-second startup (ADR-043)
- **Session management** - Git-native, filesystem-based
- **Session logging** - Defensive logging at optimal pressure (ADR-033)
- **Command structure** - `start`, `log`, `handoff`, `context`, `status`

### Key CLI Components
- `packages/cli/src/commands/start/start-reflection.ts` - Session initialization
- `packages/cli/src/lib/event-queue.ts` - Background event sync
- `packages/cli/src/lib/session-cursor.ts` - Cursor-based context loading
- `packages/cli/src/lib/context-loader-events.ts` - Event stream processing
- `packages/cli/src/core/session-log-manager.ts` - Session log management

### MCP Server (Supporting)
- `packages/mcp-server/src/` - MCP protocol implementation
- Provides context to Claude Code via MCP tools
- Git webhook processing for automatic context updates

### Development Workflow
1. **Test locally first:** `npm run build && npm test`
2. **Use git-native approach:** All CLI commands work offline
3. **Follow event-based loading:** Context loads via cursor + event stream
4. **Enable session logging:** Automatic via `ginko start` (disable with `--no-log`)

### Environment Setup
- **Node.js:** v18+ required
- **TypeScript:** Strict mode enabled
- **Git:** Required for session management

---

## References

### Architecture Decision Records
- [ADR-002: AI-Optimized File Discovery](docs/adr/ADR-002-ai-readable-code-frontmatter.md)
- [ADR-033: Context Pressure Mitigation](docs/adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-033: Implementation Guide](docs/adr/ADR-033-implementation-guide.md)
- [ADR-043: Event-Based Context Loading](docs/adr/ADR-043-event-based-context-loading.md)

### Planning & Process
- [Planning Template](docs/PLANNING-TEMPLATE.md)
- [Context Gathering Checklist](docs/CONTEXT-GATHERING-CHECKLIST.md)

---

*Last updated: 2026-01-20 | Version: 2.2 (EPIC-015 Sprint 3: Graph-Authoritative Task Status)*
