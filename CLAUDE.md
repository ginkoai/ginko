# ginko - AI Assistant Collaboration Guide

## Project Context
- **Type**: CLI tool for AI-assisted development
- **Languages**: TypeScript, JavaScript
- **Package Manager**: npm
- **License**: AGPL-3.0-or-later


## AI Assistant Critical Instructions

### Single-Word Command Execution

When the user types a **single word** that matches a ginko command, **IMMEDIATELY** execute it without ANY preamble:

**Pattern Recognition:**
- User input: `start` -> Execute: `ginko start`
- User input: `handoff` -> Execute: `ginko handoff`
- User input: `status` -> Execute: `ginko status`
- User input: `log` -> Ask for description, then execute

**DO NOT:**
- Announce what you're about to do
- Explain the command first
- Ask for confirmation
- Add any commentary before execution

**Why:** Eliminates 9+ seconds of response latency (28s -> <2s startup)

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

**Guidelines:**
- Line 1: Flow state and work mode
- Line 2: "Last session:" - what happened before
- Line 3: "Next up:" - what to work on now (start/continue)
- Sprint block: Progress + cognitive scaffolding (Follow/Apply/Avoid)
- Confidence icons: high, medium, low
- Severity icons: critical, high, medium/low

### Auto-Sync on Staleness Warning

When `ginko start` shows a staleness warning, **automatically run `ginko pull`**:

**Thresholds:**
- Critical (never synced or >7 days): Always auto-sync
- Warning (1-7 days stale): Auto-sync at session start
- No warning: Context is fresh, no action needed

> Note: `ginko pull` requires [Ginko Cloud](https://ginkoai.com). In local-only mode, this step is skipped automatically.

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


## Quick Commands
- **Build**: `npm run build`
- **Test**: `npm test`
- **Install**: `npm install`
- **Dev Server**: `npm run dev`


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
**INVENTORY -> CONTEXT -> THINK -> PLAN -> PRE-MORTEM -> VALIDATE -> ACT -> TEST**

### Root Cause Analysis Protocol

When debugging persistent or recurring issues, follow this structured approach **before attempting any fix**:

1. **Hypothesize**: Produce testable hypotheses for the root cause. For each, describe what evidence would confirm it AND what would disprove it.
2. **Rank**: Order hypotheses by likelihood.
3. **Check interactions**: Note if any hypotheses depend on or amplify each other.
4. **Separate cleanup from prevention**: Distinguish between fixing the current state and preventing recurrence. Both are required for a durable fix.
5. **Validate first**: Don't fix until you've confirmed a hypothesis with evidence.

### Task Completion Protocol

**After completing ANY sprint task, update the task status:**

```bash
ginko task complete <task_id>
```

**Task Status Commands:**
| Command | Effect |
|---------|--------|
| `ginko task start <id>` | Mark as in_progress |
| `ginko task complete <id>` | Mark as complete |
| `ginko task block <id> "reason"` | Mark as blocked |
| `ginko task pause <id>` | Return to not_started |

**Cascade option:** When completing the last task in a sprint:
```bash
ginko task complete <task_id> --cascade --yes
```

### The Vibecheck Pattern
When feeling lost or sensing misalignment:
- Call it: "I think we need a vibecheck"
- Reset: "What are we actually trying to achieve?"
- Realign: Agree on clear next steps
- Continue: Resume with fresh perspective


## Entity Naming Convention (ADR-052)

All entities use a hierarchical, sortable naming convention:

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

### Padding Rules

- Epics: 3 digits (max 999)
- Sprints: 2 digits (max 99 per epic)
- Tasks: 2 digits (max 99 per sprint)


## Context Reflexes - Automatic Thought Patterns

These "mental reflexes" activate naturally without explicit prompting:

### 1. "Why Am I Doing This?" Reflex
**Trigger**: Every 30 minutes or at major decision points
**Behavior**: Trace current work back to its purpose

### 2. "Have We Done This Before?" Reflex
**Trigger**: Before implementing any new functionality
**Behavior**: Recall similar patterns from context

### 3. "Something Feels Off" Reflex
**Trigger**: Feeling uncertain or confused (confidence < 60%)
**Behavior**: Identify what's missing and seek clarification

### 4. "Update My Understanding" Reflex
**Trigger**: After solving problems or discovering patterns
**Behavior**: Note learnings for future reference

### 5. "Track This Work" Reflex (ADR-052)
**Trigger**: Work begins outside current sprint scope
**Action**: Prompt user to create ad-hoc task for observability

### 6. "Log This For Next Session" Reflex (ADR-043)
**Trigger**: After decisions, gotchas, task completions, or blockers
**Action**: Run `ginko log "<description>" --category=<type>`

| Moment | Category | Example |
|--------|----------|---------|
| Decision made | decision | `ginko log "Chose batch size 10 for payload limits" --category=decision` |
| Gotcha found | insight | `ginko log "API has 4.5MB body limit" --category=insight --impact=high` |
| Task complete | achievement | `ginko log "Feature complete" --category=achievement` |
| Blocker hit | insight | `ginko log "Auth token expired" --category=insight` |

### 7. "Score My Context" Reflex
**Trigger**: Within 60 seconds of session start
**Behavior**: Self-assess readiness across four dimensions: Direction, Intent, Location, History (0-10 each)

### Work Mode Sensitivity
- **Hack & Ship**: Reflexes trigger less frequently (focus on speed)
- **Think & Build**: Balanced reflex activity
- **Full Planning**: Frequent reflex triggers for maximum rigor


## Confidence Indicators

When responding to non-trivial decisions or recommendations, include confidence levels:

| Level | Score | Behavior |
|-------|-------|----------|
| **High** | 80%+ | Proceed without indicator (default) |
| **Medium** | 50-80% | State confidence explicitly |
| **Low** | <50% | Ask before proceeding |

**Philosophy:** Low confidence is a STRENGTH, not a weakness. A 60% confidence score with honest questions is better than 90% with hidden assumptions.


## Rich Task Creation Protocol

When creating tasks, use the **WHY-WHAT-HOW** structure:

| Field | Purpose | Quality Bar |
|-------|---------|-------------|
| **Problem** | WHY: motivation/pain point | 1-2 sentences explaining the need |
| **Solution** | WHAT: desired outcome | 1-2 sentences describing success |
| **Approach** | HOW: implementation strategy | 2-3 sentences on technical approach |
| **Scope** | Boundaries: in/out | Both what's included AND excluded |
| **Acceptance Criteria** | Definition of done | Specific, testable items |
| **Confidence** | AI certainty (0-100%) | Honest self-assessment |


## Answering Project Questions

### Graph Commands (Requires Ginko Cloud)

The following commands require a [Ginko Cloud](https://ginkoai.com) account for graph sync:

```bash
ginko graph query "search term"        # Semantic search
ginko graph explore ADR-039            # Explore connections
ginko graph status                     # Graph health
ginko push                             # Push to graph
ginko pull                             # Pull from graph
ginko team status                      # Team-wide status
```

### Local Commands (Always Available)

| Question Type | File Location |
|--------------|---------------|
| Sprint progress | `docs/sprints/CURRENT-SPRINT.md` |
| Architecture decisions | `docs/adr/ADR-*.md` |
| Project goals | `docs/PROJECT-CHARTER.md` |
| Recent activity | `.ginko/sessions/[user]/current-events.jsonl` |
| Session logs | `.ginko/sessions/[user]/current-session-log.md` |


## TypeScript Guidelines
- Prefer interfaces over types for objects
- Use strict mode settings
- Avoid `any` - use `unknown` if type is truly unknown
- Export types from `.types.ts` files

## Testing Requirements
- **Test Command**: `npm test`
- Write tests for new features
- Maintain existing test coverage
- Run tests before committing

## Git Workflow
- **Use feature branches** when sprint plan indicates changes to multiple files
- Stay on main for single-file fixes (typos, copy changes, quick tweaks)
- Create feature branches: `feature/description`
- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Run `ginko handoff` before switching context


## Session Management
- `ginko start` - Begin new session with context loading
- `ginko handoff` - Save progress for seamless continuation
- `ginko vibecheck` - Quick realignment when stuck
- `ginko ship` - Create PR-ready branch with context


## Work Pattern Coaching

Ginko guides users toward Epic -> Sprint -> Task structure while supporting ad-hoc work when appropriate.

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

### Quick Commands

```bash
ginko sprint quick-fix "Fix the login button"   # Minimal ceremony
ginko sprint qf "Fix the login button"           # Alias
ginko sprint create                               # Conversational sprint creation
```

### Adoption Signals

Ginko tracks adoption patterns to adjust coaching intensity:
- New users: Full prompts with descriptions and coaching tips
- Regular users: Lighter prompts
- Power users: Minimal prompts (only when truly unstructured)

## Privacy & Security
- All context stored locally in `.ginko/`
- No data leaves your machine without explicit action
- Handoffs are git-tracked for team collaboration
- Config (`.ginko/config.json`) is gitignored

---
*This file is part of the Ginko open-source project. Customize it for your team's needs.*
