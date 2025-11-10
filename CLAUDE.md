# Ginko Development Guide

## Team Development Context

**Ginko** is a git-native CLI for intelligent context management in AI-assisted development.

### Quick Start
```bash
ginko start                    # Begin/resume session (< 2s startup)
ginko log "description"        # Log insights (defensive logging)
ginko handoff "summary"        # Optional session handoff
```

### AI Assistant Instructions

**CRITICAL: Immediate Command Execution**

When the user types `start` (or any single-word ginko command), **IMMEDIATELY** execute `ginko start` without any preamble, explanation, or delay. Do not:
- Announce what you're about to do
- Explain the command
- Ask for confirmation
- Add any commentary before execution

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

This optimization reduces startup time from 28s to <2s by eliminating assistant response latency.

**After Execution: Concise Readiness Message**

After `ginko start` completes, provide a brief readiness message (max 6 lines) that preserves flow:

**Template:**
```
Ready | [Flow State] | [Work Mode]
Resume: [One-line resume point summary]

[Key context if relevant - 1-2 lines]

[Next immediate action or question]
```

**Example:**
```
Ready | Hot (10/10) | Think & Build mode
Resume: Removed deprecated ginko-mcp tools and references

19 uncommitted files, 2 commits ahead of origin

What would you like to work on?
```

**Guidelines:**
- Maximum 6 lines total
- Highlight flow state and work mode in first line
- Summarize resume point concisely
- Include critical alerts (uncommitted changes, blockers)
- End with clear next action or open question
- Preserve momentum and flow continuity

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

#### Reflex Sensitivity by Work Mode
- **Hack & Ship:** Less frequent, focus on speed
- **Think & Build:** Balanced, pattern-aware (default)
- **Full Planning:** Frequent, strict hierarchy checking

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
- [ ] Add team event filtering
- [ ] Implement sprint command
```

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

*Last updated: 2025-11-06 | Version: 2.0 (optimized)*
