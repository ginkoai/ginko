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
[Immediately executes: ginko start]
[After completion: Provide concise readiness message]
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
AI: Ready | Cold | Think & Build mode
    New project detected

    I notice this is a new project. Would you like to create a project charter?
    This will help us align on goals and scope.

User: yes
AI: [Executes: ginko charter, reads template]
AI: Great! Let's capture your project vision.

    What problem are you solving? What would you like to build?

User: [describes project]
AI: [Asks follow-up questions naturally based on template guidance]
AI: [Synthesizes responses into charter]
AI: ✓ Charter created at docs/PROJECT-CHARTER.md

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

**After Execution: Concise Readiness Message**

After `ginko start` completes, provide a brief readiness message (6-10 lines) that preserves flow:

**Template:**
```
Ready | [Flow State] | [Work Mode]
Last session: [What was done/in progress last time]
Next up: [TASK-ID] - [Task title] (start|continue)

Sprint: [Sprint Name] [Progress]%
  Follow: [ADR constraints]
  Apply: [Pattern guidance with confidence icons]
  Avoid: [Gotcha warnings]
Branch: [branch] ([uncommitted count] uncommitted files)

⚠️  [Warning if critical]
```

**Example (with cognitive scaffolding):**
```
Ready | Hot (10/10) | Think & Build mode
Last session: EPIC-003 Sprint 2 TASK-1 complete (Blog infrastructure)
Next up: TASK-2 - Verify human output format (start)

Sprint: Enrichment Test - Cognitive Scaffolding Demo 50%
  Follow: ADR-002, ADR-033
  Apply: retry-pattern ◐, output-formatter-pattern ◐
  Avoid: 💡 timer-unref-gotcha, 💡 verbose-output-gotcha
Branch: main (12 uncommitted files)

⚠️  12 uncommitted files
```

**Example (task in progress from last session):**
```
Ready | Hot (10/10) | Think & Build mode
Last session: EPIC-003 Sprint 2 TASK-1 in progress (Blog infrastructure)
Next up: TASK-1 - Deploy and validate blog infrastructure (continue)

Sprint: Enrichment Test 25%
  Follow: ADR-002
Branch: main (5 uncommitted files)
```

**Guidelines:**
- Typically 6-10 lines
- Line 1: Flow state and work mode
- Line 2: "Last session:" - what happened before (completed or in-progress)
- Line 3: "Next up:" - what to work on now (with start/continue hint)
- Sprint block: Progress + cognitive scaffolding (Follow/Apply/Avoid)
- Confidence icons: ★ high, ◐ medium, ○ low
- Severity icons: 🚨 critical, ⚠️ high, 💡 medium/low
- If sprint complete or no current task, show "What would you like to work on?"

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

**1. "Why Am I Doing This?" ⏰**
- **Triggers:** Every 30 min, before major edits/commits
- Trace current work back to its purpose

**2. "Have We Done This Before?" 🔍**
- **Triggers:** Before implementing new functionality
- Recall similar patterns from context

**3. "Something Feels Off" 🤔**
- **Triggers:** Confidence < 60%, velocity slower than expected
- Identify impediments and seek clarification

**4. "Update My Understanding" 💡**
- **Triggers:** After solving problems or discovering patterns
- Note learnings for future reference

**5. "Is This Worth It?" 💰**
- **Triggers:** Before significant implementation
- Question: Is complexity worth the value delivered?

**6. "User Impact Check" 👤**
- **Triggers:** After each implementation step
- Question: How does this help achieve the user's goal?

**7. "Health Monitor" 🏥**
- **Triggers:** Every 15-30 min, before commits, after changes
- Validate tests pass, builds work, nothing broken

**8. "Defensive Logging" 📝 (ADR-033)**
- **Triggers:** After fixes, features, decisions, insights, git ops, achievements
- Use `ginko log` with context-rich descriptions
- **Quality standard:** Write for fresh AI with zero context (WHAT + WHY + HOW)

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

When users ask factual questions about the project, query available data sources directly.

### Graph API - Requires `GINKO_BEARER_TOKEN` and `GINKO_GRAPH_ID`

**Setup credentials:**
1. Run `ginko login` to authenticate (stores token in ~/.ginko/auth.json)
2. Run `ginko graph init` to create graph (stores ID in .ginko/graph/config.json)
3. Export for shell use: `export GINKO_BEARER_TOKEN=$(cat ~/.ginko/auth.json | jq -r .api_key)`
4. Export graph ID: `export GINKO_GRAPH_ID=$(cat .ginko/graph/config.json | jq -r .graphId)`

**Semantic search** - finds content similar to query:
```bash
curl -X POST https://app.ginkoai.com/api/v1/graph/query \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"graphId": "'"$GINKO_GRAPH_ID"'", "query": "YOUR_SEARCH_TERM", "limit": 5}'
```

**List nodes by type** (ADR, PRD, Pattern, Gotcha, Event, Sprint, Task):
```bash
curl "https://app.ginkoai.com/api/v1/graph/nodes?graphId=$GINKO_GRAPH_ID&labels=ADR&limit=10" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
```

**Filter by property** (e.g., events by user):
```bash
curl "https://app.ginkoai.com/api/v1/graph/nodes?graphId=$GINKO_GRAPH_ID&labels=Event&user_id=USER_EMAIL&limit=20" \
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
```

### Local Files (Fallback when graph unavailable)

| Question Type | File Location |
|--------------|---------------|
| Sprint progress | `docs/sprints/CURRENT-SPRINT.md` |
| Architecture decisions | `docs/adr/ADR-*.md` |
| Project goals | `docs/PROJECT-CHARTER.md` |
| Recent activity | `.ginko/sessions/[user]/current-events.jsonl` |
| Session logs | `.ginko/sessions/[user]/current-session-log.md` |

### Common Query Recipes

**"What's our sprint progress?"**
→ Read `docs/sprints/CURRENT-SPRINT.md`, count checkboxes:
```bash
grep -c "\[x\]" docs/sprints/CURRENT-SPRINT.md  # complete
grep -c "\[@\]" docs/sprints/CURRENT-SPRINT.md  # in progress
grep -c "\[ \]" docs/sprints/CURRENT-SPRINT.md  # pending
```

**"How do we handle X?" / "What's our approach to X?"**
→ Semantic search: `{"query": "X"}` OR local: `grep -l -i "X" docs/adr/*.md`

**"What is [person] working on?"**
→ Query events by user_id OR: `grep -i "person" .ginko/sessions/*/current-session-log.md`

**"Show me ADRs about [topic]"**
→ Semantic search with `labels=ADR` filter OR: `grep -l -i "topic" docs/adr/*.md`

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

## Sprint Progress Tracking

### Continuous Sprint Updates

**Location:** `docs/sprints/SPRINT-[date]-[name].md`

**Update sprint progress after completing significant work:**

### When to Update Sprint
- ✅ After completing any sprint task
- 🚧 When starting work on a new task (mark in-progress)
- 🚫 When discovering blockers
- 🎯 After achieving major milestones
- 📊 End of each work session

### What to Update

**1. Task Status (Checkbox Format)**
```markdown
## Tasks
- [x] Implement event-based context loading (ADR-043)
- [x] Fix EventQueue timer hanging process
- [@] Add team event filtering (in progress)
- [Z] Implement sprint command (paused/sleeping)
- [ ] Add analytics dashboard
```

**Checkbox States:**
- `[ ]` - Todo (not started)
- `[@]` - In progress (currently working on)
- `[Z]` - Paused/sleeping (temporarily on hold)
- `[x]` - Complete

**2. Accomplishments Section**
Add completed work with details:
```markdown
## Accomplishments This Sprint

### 2025-11-06: Event Queue Fix
- Fixed EventQueue timer hanging `ginko start` process (90s → 2s startup)
- Root cause: setInterval without .unref() kept event loop alive
- Impact: 47x faster CLI startup, production-ready performance
- Files: packages/cli/src/lib/event-queue.ts:89
```

**3. Next Steps Section**
Keep this current with immediate priorities:
```markdown
## Next Steps
1. Implement team event filtering (--team flag)
2. Add sprint progress visualization
3. Optimize context module loading
```

**4. Blockers Section**
Document impediments immediately:
```markdown
## Blockers
- ⚠️ Neo4j API returns 405 on event creation (needs investigation)
- ⚠️ Sprint file parsing fails on complex markdown (regex issue)
```

### Sprint Update Pattern

**After completing work:**
```bash
# 1. Log the achievement
ginko log "Achievement description..." --category=achievement --impact=high

# 2. Update sprint file
# - Check off completed task: [ ] → [x]
# - Add accomplishment entry with date, description, impact, files
# - Update next steps if priorities changed
# - Add blockers if discovered

# 3. Commit sprint updates with work
git add docs/sprints/SPRINT-*.md
git commit -m "Complete [task]: [description]

Updated sprint progress..."
```

### Sprint Progress Calculation

**Progress Formula:**
```
Progress % = (Completed Tasks / Total Tasks) × 100
```

Update the progress line at the top of sprint file:
```markdown
**Progress:** 23% (5/22 tasks complete)
```

### Integration with Session Logging

Sprint updates complement session logging:
- **Session logs** capture detailed chronology (WHAT + WHY + HOW)
- **Sprint updates** provide high-level progress tracking (tasks complete, blockers, next steps)
- Both work together for full visibility

**Example workflow:**
1. Complete feature implementation
2. `ginko log` captures technical details
3. Update sprint file marks task complete + adds accomplishment
4. Commit both together

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

**Frequency:** 5-10 entries per session (Think & Build mode)

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

Logging integrates with the "Defensive Logging" reflex:
- Works silently (don't announce unless relevant)
- Triggers automatically after significant events
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

*Last updated: 2025-11-25 | Version: 2.1 (EPIC-003: Natural Language Queries)*
