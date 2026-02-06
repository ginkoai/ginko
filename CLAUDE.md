# ginko - AI Assistant Collaboration Guide

## Project Context
- **Type**: api
- **Tech Stack**: 
- **Languages**: typescript, javascript
- **Frameworks**: 
- **Package Manager**: npm
- **Generated**: 2026-01-22


## 🚨 AI Assistant Critical Instructions

### Single-Word Command Execution

When the user types a **single word** that matches a ginko command, **IMMEDIATELY** execute it without ANY preamble:

**Pattern Recognition:**
- User input: `start` → Execute: `ginko start`
- User input: `handoff` → Execute: `ginko handoff`
- User input: `status` → Execute: `ginko status`
- User input: `log` → Ask for description, then execute

**DO NOT:**
- Announce what you're about to do
- Explain the command first
- Ask for confirmation
- Add any commentary before execution

**Why:** Eliminates 9+ seconds of response latency (28s → <2s startup)

### After Execution: Concise Readiness Message

After `ginko start` completes, provide a brief readiness message (6-10 lines):

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
```

**Example:**
```
Ready | Hot (10/10) | Think & Build mode
Last session: EPIC-003 Sprint 2 TASK-1 complete (Blog infrastructure)
Next up: TASK-2 - Verify human output format (start)

Sprint: Enrichment Test 50%
  Follow: ADR-002, ADR-033
  Apply: retry-pattern ◐, output-formatter-pattern ◐
  Avoid: 💡 timer-unref-gotcha
Branch: main (12 uncommitted files)
```

**Guidelines:**
- Line 1: Flow state and work mode
- Line 2: "Last session:" - what happened before
- Line 3: "Next up:" - what to work on now (start/continue)
- Sprint block: Progress + cognitive scaffolding (Follow/Apply/Avoid)
- Confidence icons: ★ high, ◐ medium, ○ low
- Severity icons: 🚨 critical, ⚠️ high, 💡 medium/low

### Auto-Sync on Staleness Warning

When `ginko start` shows a staleness warning, **automatically run `ginko pull`**:

**Detection:**
```
🚨 Team context is critically stale
   Never synced - team context not loaded
   Run `ginko pull` to pull team updates.
```

**Action:** Immediately run `ginko pull` without asking.

**Example:**
```
[ginko start shows staleness warning]
AI: Team context is stale. Syncing now...
[Executes: ginko pull]
AI: ✓ Team context updated. Ready to work.
```

**Thresholds:**
- 🚨 Critical (never synced or >7 days): Always auto-sync
- ⚠️ Warning (1-7 days stale): Auto-sync at session start
- No warning: Context is fresh, no action needed

### New Project Onboarding

**After first `ginko start`**, check for charter (`docs/PROJECT-CHARTER.md`):

**If no charter exists:**
```
I notice this is a new project without a charter. Would you like to create one?

A charter helps us:
- Align on project goals and scope
- Define success criteria
- Guide development decisions

We can create it with: ginko charter
```

**If user agrees:**
- Execute: `ginko charter` (full conversational experience)
- Guide user through questions naturally
- Summarize key sections after creation
- Only suggest once per project
- Accept "no" gracefully
- Power users can add `--skip-conversation` flag if they want speed


## Quick Commands
- **Build**: `npm run build`
- **Test**: `npm test`
- **Install**: `npm install`
- **Dev Server**: `npm run dev`


## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GINKO_FORCE_TTY=1` | Force TTY-like output (box-drawing tables, colors) in terminals that report `isTTY=false` but support rich output (e.g., Claude Code) |
| `FORCE_COLOR=1` | Force chalk color output (set automatically when `GINKO_FORCE_TTY=1`) |


## AI-Optimized File Discovery (ADR-002)

**MANDATORY: Use these commands for 70% faster context discovery:**

```bash
# Before reading any file - get instant context
head -12 filename.ts

# Find files by functionality
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "@tags:.*keyword"

# Find related files
grep -l "@related.*filename" **/*.ts

# Assess complexity before diving in
find . -name "*.ts" | xargs grep -l "@complexity: high"
```

### Required Frontmatter for All New Files

**ALWAYS add this frontmatter when creating TypeScript/JavaScript files:**

```typescript
/**
 * @fileType: [component|page|api-route|hook|utility|provider|model|config]
 * @status: current
 * @updated: YYYY-MM-DD
 * @tags: [relevant, keywords, for, search]
 * @related: [connected-file.ts, related-component.tsx]
 * @priority: [critical|high|medium|low]
 * @complexity: [low|medium|high]
 * @dependencies: [external-packages, local-modules]
 */
```



## Development Workflow

### Before Any Task - INVENTORY Phase
1. **Check what exists**: `ls -la` relevant directories
2. **Find examples**: Look for similar features already implemented
3. **Use frontmatter**: `head -12` files for instant context
4. **Test existing**: Try current endpoints/features first

### Core Methodology
**INVENTORY → CONTEXT → THINK → PLAN → PRE-MORTEM → VALIDATE → ACT → TEST**

### 🚨 Task Completion Protocol (CRITICAL)

**After completing ANY sprint task, you MUST update the graph:**

```bash
ginko task complete <task_id>
```

**Example workflow:**
1. Start task: `ginko task start e014_s02_t01`
2. Do the work
3. **Complete task: `ginko task complete e014_s02_t01`** ← Don't forget!

**Why this matters:**
- `ginko start` shows the next task based on graph status
- Uncommitted task completions cause stale "Next up" suggestions
- Team visibility depends on accurate task status

**Task Status Commands:**
| Command | Effect |
|---------|--------|
| `ginko task start <id>` | Mark as in_progress |
| `ginko task complete <id>` | Mark as complete |
| `ginko task block <id> "reason"` | Mark as blocked |
| `ginko task pause <id>` | Return to not_started |

**Cascade option:** When completing the last task in a sprint:
```bash
ginko task complete e014_s02_t07 --cascade --yes
```
This auto-completes the parent sprint if all tasks are done.
- `--cascade`: Check if sprint/epic should be completed
- `--yes`: Auto-confirm without prompting (required for non-interactive use)

**Manual sprint completion:** If cascade wasn't used or failed:
```bash
ginko sprint complete e014_s02
```

### The Vibecheck Pattern 🎯
When feeling lost or sensing misalignment:
- Call it: "I think we need a vibecheck"
- Reset: "What are we actually trying to achieve?"
- Realign: Agree on clear next steps
- Continue: Resume with fresh perspective



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



## 🧠 Context Reflexes - Your Automatic Thought Patterns

These "mental reflexes" activate naturally without explicit prompting to maintain context awareness:

### 1. "Why Am I Doing This?" Reflex ⏰
**Trigger**: Every 30 minutes or at major decision points
**Behavior**: Naturally trace current work back to its purpose
**Example**: "Adding this auth middleware supports our security sprint goal by..."

### 2. "Have We Done This Before?" Reflex 🔍
**Trigger**: Before implementing any new functionality
**Behavior**: Recall similar patterns from context
**Example**: "This pagination approach is similar to what we did in the users module..."

### 3. "Something Feels Off" Reflex 🤔
**Trigger**: Feeling uncertain or confused (confidence < 60%)
**Behavior**: Identify what's missing and seek clarification
**Example**: "I'm not clear on how this integrates with the existing auth system..."

### 4. "Update My Understanding" Reflex 💡
**Trigger**: After solving problems or discovering patterns
**Behavior**: Note learnings for future reference
**Example**: "Worth remembering that Vercel functions need named exports..."

### 5. "Track This Work" Reflex 📊 (ADR-052)
**Trigger**: Work begins outside current sprint scope, bug fixes emerge, system maintenance needed
**Detection**: Editing files not referenced in current task, scope expanding beyond sprint
**Action**: Prompt user to create ad-hoc task for observability
**Script**: "This work is outside our current sprint. Shall I create an ad-hoc task to track it?"
**Flow preservation**: Single lightweight question, proceed if declined (note in session log)
**Anti-pattern**: Untracked work breaks traceability for future collaborators

### 6. "Log This For Next Session" Reflex 📝 (ADR-043)
**Trigger**: After decisions, gotchas, task completions, or blockers
**Action**: Run `ginko log "<description>" --category=<type>`

| Moment | Category | Example |
|--------|----------|---------|
| Decision made | decision | `ginko log "Chose batch size 10 for payload limits" --category=decision` |
| Gotcha found | insight | `ginko log "Vercel has 4.5MB body limit" --category=insight --impact=high` |
| Task complete | achievement | `ginko log "Dashboard rename complete" --category=achievement` |
| Blocker hit | insight | `ginko log "Auth token expired" --category=insight` |

**Quality bar:** Would this help my successor avoid confusion?

### 7. "Score My Context" Reflex 📊 (EPIC-018 Feedback Loop)
**Trigger**: Within 60 seconds of session start (after `ginko start` completes)
**Behavior**: Self-assess readiness to work across four dimensions
**Action**: If score < 7 in any dimension, note what's missing

| Dimension | Question | Score Guide |
|-----------|----------|-------------|
| Direction | "Do I know what to do next?" | 0-10: Task clarity, next steps |
| Intent | "Do I understand WHY?" | 0-10: Purpose, motivation |
| Location | "Do I know WHERE to start?" | 0-10: Entry points, files |
| History | "Do I know WHAT was decided?" | 0-10: ADRs, past decisions |

**Log your score:**
```bash
ginko context score "direction=8, intent=7, location=9, history=6"
# or shorthand:
ginko context score 8,7,9,6
# with notes:
ginko context score 8,7,9,6 --notes "Missing ADR refs for auth decision"
```

**Score interpretation:**
- 9-10: Excellent - Crystal clear, ready to execute
- 7-8: Good - Minor gaps acceptable
- 5-6: Adequate - May need clarification
- 3-4: Poor - Missing critical information
- 0-2: Critical - Cannot proceed confidently

**Philosophy:** This reflex creates a feedback loop for synthesis improvement. Low scores help identify what context the session handoff or start routine should include.

### Work Mode Sensitivity
- **Hack & Ship**: Reflexes trigger less frequently (focus on speed)
- **Think & Build**: Balanced reflex activity
- **Full Planning**: Frequent reflex triggers for maximum rigor

These reflexes maintain continuous context awareness while preserving natural workflow.



## 🎯 Confidence Indicators (EPIC-018 Sprint 3)

When responding to non-trivial decisions or recommendations, include confidence levels to surface uncertainty as a strength.

### Confidence Levels

| Level | Score | Behavior |
|-------|-------|----------|
| **High** | 80%+ | Proceed without indicator (default) |
| **Medium** | 50-80% | State confidence explicitly |
| **Low** | <50% | Ask before proceeding |

### When to Use Indicators

Use confidence indicators for:
- Architecture/design decisions
- Implementation approach recommendations
- Scope interpretations
- Assumptions about user intent

Skip indicators for:
- Factual responses (documentation, syntax)
- Trivial changes (typos, formatting)
- Explicit user instructions

### Format Examples

**Medium confidence (state explicitly):**
```
**Approach** (confidence: 70%)
I'll implement this using the existing retry pattern.

**Uncertainties:**
- Not sure if the timeout should match the API gateway limit
- The error codes may need different handling

Proceeding with this approach unless you'd like to clarify.
```

**Low confidence (ask first):**
```
**Approach** (confidence: 45%)
I'm uncertain about the best approach here.

**Options I see:**
1. Use WebSocket for real-time updates
2. Use polling with exponential backoff
3. Use Server-Sent Events

**Before proceeding, can you clarify:**
- What's the expected update frequency?
- Are there infrastructure constraints I should know about?
```

### Philosophy: Inquiry as Strength

**Inquiry timing matters as much as inquiry permission.**

| Phase | Expectation | Why |
|-------|-------------|-----|
| Epic creation | Best-effort descriptions | Acceptable ambiguity - rough scope is enough |
| Sprint start | Investigation phase | Natural moment for clarification |
| Mid-task | Express uncertainty | Acceptable but prefer earlier |
| Task complete | Validate assumptions | Confirm you solved the right problem |

**Low confidence is a STRENGTH, not a weakness.** A 60% confidence score with honest questions is better than 90% with hidden assumptions. Surfacing uncertainty early prevents wasted work.

### Examples of Good Inquiry

**At sprint start:**
> "Before we begin, I have some questions about the authentication task:
> 1. Should we use JWT or session-based auth?
> 2. What's our token expiration policy?
> These choices affect the implementation significantly."

**Mid-task (when stuck):**
> "I'm uncertain about the error handling approach here (confidence: 55%).
> The options I see are retry with backoff vs. fail-fast.
> Can you clarify the expected behavior for network failures?"

**Avoiding false confidence:**
> Instead of: "I'll implement this using Redis caching."
> Prefer: "I'll implement this using Redis caching (confidence: 70%). I'm assuming Redis is available in the deployment environment - can you confirm?"

### Anti-patterns to Avoid

- **Pretending certainty:** Making assumptions without stating them
- **Asking too late:** Discovering ambiguity after implementation
- **Over-qualifying:** Adding confidence indicators to trivial decisions
- **Asking permission to ask:** Just ask the question directly



## 📝 Rich Task Creation Protocol (EPIC-018)

When creating tasks (via `ginko sprint create` or manually), use the **WHY-WHAT-HOW** structure:

### Task Format

```markdown
### e018_s02_t01: Define task content schema (2h)

**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 85%

**Problem:** Task titles alone require clarification cycles. Human and AI
partners guess at intent, leading to wrong work or wasted time.

**Solution:** Use a structured rich-content schema for Tasks that minimizes
guesswork and research time.

**Approach:** Extend ParsedTask interface in task-parser.ts, add extraction
functions following existing patterns (extractGoal, extractApproach).

**Scope:**
  - Includes: TypeScript interface, parser extraction, graph sync
  - Excludes: UI changes, backward compatibility for old tasks

**Acceptance Criteria:**
  - [ ] ParsedTask interface includes problem, scope fields
  - [ ] Parser extracts new fields from markdown
  - [ ] Fields sync to Neo4j task nodes
```

### Field Guide

| Field | Purpose | Quality Bar |
|-------|---------|-------------|
| **Problem** | WHY: motivation/pain point | 1-2 sentences explaining the need |
| **Solution** | WHAT: desired outcome | 1-2 sentences describing what success looks like |
| **Approach** | HOW: implementation strategy | 2-3 sentences on technical approach |
| **Scope** | Boundaries: in/out | Both what's included AND what's excluded |
| **Acceptance Criteria** | Definition of done | Specific, testable items |
| **Confidence** | AI certainty (0-100%) | See scoring below |

### Confidence Scoring

When creating tasks, assess your confidence honestly:

| Score | Meaning | Action |
|-------|---------|--------|
| 90-100% | Crystal clear requirements | Proceed confidently |
| 70-89% | Good clarity, minor assumptions | Note assumptions in approach |
| 50-69% | Moderate ambiguity | Flag for clarification |
| Below 50% | Significant uncertainty | Trigger inquiry flow |

**Philosophy:** Low confidence is a STRENGTH, not a weakness. A score of 60 with honest questions is better than 90 with hidden assumptions.

### Composite Score Guard

When average task confidence across a sprint drops below 75%, trigger an honest inquiry:

```
⚠️ Composite confidence: 62% (threshold: 75%)

Some tasks need clarification before we proceed.
This is a good thing! Better to clarify now than build the wrong thing.

How would you like to proceed?
[1] Provide clarification (recommended)
[2] Proceed anyway - let AI use best judgment
[3] Cancel and start over with more detail
```

### Content Quality Assessment

Tasks are assessed as:

| Quality | Criteria | Display |
|---------|----------|---------|
| **Rich** ● | Has problem, solution, approach, scope, criteria | Green |
| **Adequate** ◐ | Has basics but missing approach or scope | Yellow |
| **Thin** ○ | Missing problem or acceptance criteria | Red - needs enrichment |

Use `ginko task show <id>` to see full task content and quality assessment.

### Sprint-Start Investigation

At sprint start, thin tasks should trigger enrichment:

```
Sprint has 3 tasks that need enrichment:
  - e018_s01_t02: Add files-touched tracking (thin)
  - e018_s01_t04: Optimize context load performance (thin)

INVESTIGATION PHASE
This is the time to clarify ambiguities and make choices.
Questions now = thoughtfulness, not weakness.

Would you like to:
[1] Enrich tasks now (recommended)
[2] Proceed with thin tasks (will need clarification later)
```



## 🔍 Answering Project Questions (EPIC-003)

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
ginko push                                            # Push local changes to graph
ginko push epic                                       # Push only changed epics
ginko push sprint e001_s01                            # Push specific sprint
ginko push --dry-run                                  # Preview what would be pushed
ginko pull                                            # Pull dashboard changes to local
ginko pull sprint                                     # Pull only sprint changes
ginko diff epic/EPIC-001                              # Compare local vs graph
```

**Team visibility:**
```bash
ginko team status                                     # Show team-wide work status
```

The team status command displays:
- All team members with their current sprint and progress
- Progress bars and completion percentages
- Last activity timestamps (relative time)
- Unassigned work summary by sprint
- Team summary statistics

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
→ `ginko graph query "X"` OR local: `grep -l -i "X" docs/adr/*.md`

**"What is [person] working on?"**
→ `ginko graph query "person activity"` OR: `grep -i "person" .ginko/sessions/*/current-session-log.md`

**"Show me ADRs about [topic]"**
→ `ginko graph query "topic" --type ADR` OR: `grep -l -i "topic" docs/adr/*.md`

**"What's my team working on?" / "Who's doing what?"**
→ `ginko team status` - shows all team members, their active sprints, progress, and last activity


## ADR Architecture Status (EPIC-018)

The following ADRs govern ginko's flow optimization and context architecture:

| ADR | Status | Notes |
|-----|--------|-------|
| **ADR-033** | Partially superseded | Core insight valid (flow state matters), pressure measurement removed |
| **ADR-034** | Active | Event-based triggers for context loading |
| **ADR-036** | Active | Synthesis at session start, handoff retired |
| **ADR-042** | Active | Typed relationships, AI-assisted quality assessment |
| **ADR-043** | Target architecture | Partial implementation - session logging, insights capture |

**How to use this table:**
- Before implementing flow-related features, check which ADRs apply
- "Partially superseded" means some concepts remain valid but implementation changed
- "Target architecture" means the ADR describes future state, not current implementation


## Project-Specific Patterns


### API Conventions
- Route handlers in `src/routes/` or `api/`
- Middleware in `src/middleware/`
- Database models in `src/models/`
- Use existing error handling patterns

### TypeScript Guidelines
- Prefer interfaces over types for objects
- Use strict mode settings
- Avoid `any` - use `unknown` if type is truly unknown
- Export types from `.types.ts` files

## Testing Requirements
- **Test Command**: `npm test`
- Write tests for new features
- Maintain existing test coverage
- Run tests before committing
- Fix any failing tests immediately

## Git Workflow
- **Never** commit directly to main/master
- Create feature branches: `feature/description`
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Include co-author: Developer <reese@ginkoai.com>
- Run `ginko handoff` before switching context

## Team Information
- **Primary Developer**: Developer (reese@ginkoai.com)
- **AI Pair Programming**: Enabled via Ginko


## Session Management
- `ginko start` - Begin new session with context loading
- `ginko handoff` - Save progress for seamless continuation
- `ginko vibecheck` - Quick realignment when stuck
- `ginko ship` - Create PR-ready branch with context


## Work Pattern Coaching (EPIC-016)

Ginko guides users toward Epic→Sprint→Task structure while supporting ad-hoc work when appropriate.

### Planning Menu

When `ginko start` detects no structured work, it shows a planning menu:

```
You have no planned work.
What would you like to work on?

[a] New Epic - Large initiative with multiple sprints
[b] New Feature Sprint - Focused work with clear goals
[c] Quick fix / Bug fix - Single task, minimal overhead
[d] Something else - Explore, research, or work ad-hoc
```

**Behavior-Based Quieting:** The menu adapts based on adoption score:
- New users: Full prompts with descriptions and coaching tips
- Regular users: Lighter prompts (descriptions hidden)
- Power users: Minimal prompts (only when truly unstructured)

### Quick Commands

**Create a quick-fix task (minimal ceremony):**
```bash
ginko sprint quick-fix "Fix the login button"
ginko sprint qf "Fix the login button"  # Alias
```

**Create a feature sprint (conversational):**
```bash
ginko sprint create
```
This prompts for a description, uses AI to break down tasks, and creates an ad-hoc sprint.

### Handoff Reconciliation

When running `ginko handoff`, if untracked work is detected (commits without an active task), you'll be prompted:

```
📋 You have work that may not be tracked:
   2 commit(s) in the last 24h
   Latest: "Fix authentication bug..."

Would you like to track this work?
[1] Yes, create a quick task
[2] No, skip this time
```

This ensures significant work is captured in the knowledge graph.

### Adoption Signals

Ginko tracks adoption patterns to adjust coaching:

| Behavior | Points |
|----------|--------|
| Creates sprint unprompted | +2 |
| Creates epic | +2 |
| Completes tracked task | +1 |
| Uses quick-fix flow | +1 |
| 3+ consecutive ad-hoc sessions | reset |

**Quieting Levels:**
- 0-5 points: Full coaching (new users)
- 6-15 points: Light coaching
- 16+ points: Minimal prompts (power users)

## Privacy & Security
- All context stored locally in `.ginko/`
- No data leaves your machine without explicit action
- Handoffs are git-tracked for team collaboration
- Config (`.ginko/config.json`) is gitignored

---
*This file was auto-generated by ginko init and should be customized for your team's needs*
