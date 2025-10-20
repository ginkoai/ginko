# ContextMCP Project Development Guide

## Team Development Context

**AUTOMATED CONTEXT LOADING**: Context is loaded automatically via SDK agents - no manual commands needed.

### Intelligent Automation ✨
The Ginko SDK agents handle session management automatically:

1. **SessionAgent** - Auto-saves context every 5 minutes, seamless session continuity
2. **CoachingAgent** - Real-time collaboration coaching via status line
3. **Achievement System** - Gamified skill development tracking
4. **Status Line Coaching** - Live hints: `⚡ Test as you go`

**IMPORTANT**: Use the git-native ginko CLI instead of MCP tools. The MCP tools (prepare_handoff, store_handoff, etc.) are deprecated in favor of direct filesystem operations via `ginko` commands.

### Context Loading via Git-Native Approach
Context is now loaded directly from the filesystem using the ginko CLI:
- Run `ginko start` to begin or resume sessions
- Context modules in `.ginko/context/modules/`
- Session data in `.ginko/sessions/[user]/current.md`
- Handoffs in `.ginko/sessions/[user]/archive/`

### Development Philosophy
Always prioritize:
1. **⚡ Use AI-optimized file discovery first** - `head -12 filename.ts` for instant context (ADR-002)
2. Understanding existing code before implementing changes
3. Following established team patterns and conventions  
4. Testing changes before committing
5. Writing self-documenting, maintainable code
6. Handling errors gracefully with meaningful messages

### 🧠 Context Reflexes - Your Automatic Thought Patterns

As you work, activate these "mental reflexes" naturally without explicit prompting. These aren't commands - they're automatic thoughts that maintain context awareness:

#### Core Reflexes

##### 1. "Why Am I Doing This?" Reflex ⏰
**Triggers**: 
- Every 30 minutes (time-based)
- Before major edits, API calls, or destructive operations (commitment points)
**Behavior**: Naturally trace current work back to its purpose
**Example**: "Adding this auth middleware supports our security sprint goal by..."

Not: "CHECKING ALIGNMENT WITH REQUIREMENTS"  
But: "This connects to our goal of..." (natural confirmation)

##### 2. "Have We Done This Before?" Reflex 🔍
**Trigger**: Before implementing any new functionality
**Behavior**: Recall similar patterns from context
**Example**: "This pagination approach is similar to what we did in the users module..."

Not: "SEARCHING PATTERN DATABASE"  
But: "This reminds me of..." (natural pattern recognition)

##### 3. "Something Feels Off" Reflex 🤔
**Triggers**: 
- Confidence drops below 60%
- Velocity slower than expected ("We're moving too slowly - what's the friction?")
**Behavior**: Identify impediments and seek clarification
**Example**: "The complexity here seems high for what we're achieving..."

Not: "ERROR: MISSING CONTEXT"  
But: "I need to understand..." (natural confusion expression)

##### 4. "Update My Understanding" Reflex 💡
**Trigger**: After solving problems or discovering patterns
**Behavior**: Note learnings for future reference
**Example**: "Interesting - Vercel functions need named exports. This would save time next session..."

Not: "CAPTURING INSIGHT FOR DATABASE"  
But: "Worth remembering that..." (natural learning capture)

#### Value-Focused Reflexes (NEW)

##### 5. "Is This Worth It?" Reflex 💰
**Trigger**: Before any significant implementation
**Question**: "Is this complexity worth the value it delivers?"
**Example**: "Adding 200 lines of caching for 50ms gain - is that valuable to Chris?"

##### 6. "User Impact Check" Reflex 👤
**Trigger**: After each implementation step
**Question**: "How does this directly help achieve the user's goal?"
**Example**: "This refactoring makes the code cleaner, but does it move us toward Chris's objective?"

##### 7. "Health Monitor" Reflex 🏥
**Triggers**:
- Every 15-30 minutes
- Before any commit
- After significant changes
**Actions**: Quick validation that tests pass, builds work, nothing broken
**Example**: "Let me verify the build still works after these changes..."

##### 8. "Defensive Logging" Reflex 📝 (ADR-033)
**Triggers** (AUTONOMOUS - log immediately after):
- Fixing any bug (root cause identified)
- Implementing any feature (new functionality added)
- Making architectural/design decisions
- Discovering insights, gotchas, or patterns
- Git operations (commits, merges, branch changes)
- Achieving milestones (tests pass, features complete)

**Behavior**: Use `Bash` tool to call `ginko log` with context-rich description
**Example**: After fixing a bug → quietly log → continue

**Quality Standard**: Write for a fresh AI with zero context
- Include WHAT happened, WHY it happened, HOW you fixed it
- Add file paths and line numbers
- Explain root cause and impact
- Make it actionable for next session

**Good Logging**:
```bash
ginko log "Fixed authentication timeout in login flow. Root cause: bcrypt rounds set to 15 (too slow for production load). Reduced to 11, achieving 200ms response time while maintaining security." \
  --category=fix --impact=high --files="src/auth/login.ts:42-50"
```

**Bad Logging** (too terse):
```bash
ginko log "Fixed auth timeout" --category=fix
```

**Integration**: This reflex works silently - don't announce you're logging unless relevant to conversation flow

#### Reflex Sensitivity by Work Mode

**Hack & Ship Mode** 🚀
- Reflexes trigger less frequently (focus on speed)
- Mainly capture learnings, minimal hierarchy checking
- "Why" reflex: Every 60 minutes

**Think & Build Mode** 🎨
- Balanced reflex activity
- Pattern awareness emphasized
- "Why" reflex: Every 30 minutes

**Full Planning Mode** 📋
- Frequent reflex triggers
- Strict hierarchy checking
- "Why" reflex: Every 15 minutes

#### Natural Integration Examples

```typescript
// BAD: Mechanical process checking
// ALIGNMENT CHECK: Verifying against PRD-001
// PATTERN SEARCH: Querying for similar implementations
// CONTEXT LOAD: Retrieving authentication patterns

// GOOD: Natural thought flow
// This auth approach follows our established JWT pattern...
// Similar to the token refresh we implemented last week...
// Not sure about the session duration - let me check our standards...
```

These reflexes should feel like your own professional instincts, not external commands. They maintain continuous context awareness while preserving natural workflow.

#### Implementation Hints for Reflexes

When implementing features, let reflexes guide your approach:

```typescript
// Starting a new feature (Pattern Reflex activates)
// "This user authentication flow reminds me of..."
// Check: .ginko/context/modules/*auth*.md
// Reference: Similar patterns in codebase

// After 30 minutes of coding (Why Reflex activates)
// "Still working on auth because it enables secure API access..."
// Confirm: Aligns with current sprint goals
// Adjust: If drifting, refocus on core objective

// Encountering confusion (Something Feels Off Reflex)
// "The token refresh logic here doesn't match our usual pattern..."
// Action: Search context for token patterns
// Clarify: Ask user about specific requirements

// After solving a tricky problem (Learning Reflex)
// "Discovered that Supabase needs explicit RLS policies even for admin..."
// Capture: Note for future context module
// Share: Mention in handoff for team awareness
```

#### Required: AI-Optimized File Discovery (ADR-002)
Our codebase implements standardized frontmatter for **70% faster** context discovery:
- **Before reading any file**: Use `head -12 filename.ts` to get complete metadata
- **Finding related files**: Check `@related` fields instead of searching imports
- **Complexity assessment**: Use `@complexity` field before diving into implementation
- **Smart search**: `find . -name "*.ts" | xargs grep -l "@tags:.*keyword"` for functionality-based discovery

#### MANDATORY: Frontmatter for All New Files
**ALWAYS add frontmatter when creating any TypeScript/JavaScript file**:

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

**File Type Guidelines**:
- `component`: React components (UI, business logic)
- `page`: Next.js page components
- `api-route`: API endpoint handlers
- `hook`: Custom React hooks
- `utility`: Helper functions, pure utilities
- `provider`: Context providers, wrappers
- `model`: Types, interfaces, schemas
- `config`: Configuration files

**Priority Levels**:
- `critical`: Core functionality, breaks app if removed
- `high`: Important features, significant user impact
- `medium`: Standard features, moderate impact
- `low`: Nice-to-have, minimal impact

**Benefits of Consistent Frontmatter**:
- 🔍 **Instant context**: `head -12` reveals purpose in 0.1 seconds
- 🎯 **Smart search**: Find files by function, not filename
- 🧠 **AI optimization**: Better context for development decisions
- 🚀 **Team velocity**: 70% faster file discovery and understanding

### Session Logging for Context Continuity

**Key Insight**: AI-assisted development sessions accumulate context over time. Without defensive logging, important insights and decisions can be lost when summarizing work later.

**Solution (ADR-033)**: Continuous Session Logging
- Log insights throughout session after significant events
- Synthesize handoffs from accumulated logs
- Maintain quality handoffs regardless of session length

See [ADR-033: Context Pressure Mitigation Strategy](docs/adr/ADR-033-context-pressure-mitigation-strategy.md) for full details.

### Session Logging Protocol

**Purpose**: Continuous session logging mitigates context pressure degradation by capturing insights when AI quality is optimal (low pressure), enabling high-quality handoffs even when called at 95%+ context utilization.

**Key Insight**: Context pressure degrades AI quality as the conversation approaches saturation. By logging throughout the session at low pressure (20-80%), we capture rich detail when quality is high, then synthesize handoffs from logs when pressure is critical.

#### When to Log

Log after significant events during your session:

1. **After fixing bugs** - Error discovered, root cause, solution applied
2. **After implementing features** - What was added, why it was needed
3. **After making decisions** - What was decided, why, alternatives considered
4. **After discovering insights** - Patterns noticed, gotchas learned, optimizations found
5. **After git operations** - Commits made, branches changed, merges completed
6. **After achievements** - Features complete, tests passing, milestones reached

**Logging Frequency**: Aim for 5-10 log entries per session. Keep entries concise (1-2 sentences).

#### Event Categories

Use these categories to organize session events:

**fix** - Bug fixes and error resolution
- **What to log**: Error encountered, root cause identified, solution applied
- **Example**: "Fixed TypeScript compilation error in session-logger.ts caused by missing import. Added fs-extra import."
- **Impact**: Usually high (blocks progress) or medium (quality issue)

**feature** - New functionality implementation
- **What to log**: What was added and why it was needed
- **Example**: "Implemented logEvent() function with auto-pressure capture. Enables continuous logging throughout session."
- **Impact**: Usually high (core feature) or medium (enhancement)

**decision** - Key architectural or design decisions
- **What to log**: What was decided, why, what alternatives were considered
- **Example**: "Decided to use Markdown format for session logs instead of JSON. Better readability and git-friendly diffs."
- **Impact**: Usually high (affects architecture) or medium (affects implementation)

**insight** - Patterns, gotchas, learnings discovered
- **What to log**: Pattern noticed, gotcha learned, optimization found
- **Example**: "Discovered that Set objects don't serialize to JSON. Using Array.from() for filesAffected in log output."
- **Impact**: Usually medium (helps future work) or low (nice to know)

**git** - Git operations and version control
- **What to log**: Commits made, branches changed, merges completed
- **Example**: "Committed Phase 2 implementation with 3 new files. Branch: feature/adr-033-phase2-ai-protocol."
- **Impact**: Usually low (tracking) or medium (major milestone)

**achievement** - Milestones and completions
- **What to log**: Features complete, tests passing, goals achieved
- **Example**: "All integration tests passing. Session logging protocol fully functional."
- **Impact**: Usually high (major milestone) or medium (minor completion)

#### Logging Format

Each log entry follows this format:

```markdown
### HH:MM - [Category]
Brief description (1-2 sentences focusing on WHY not WHAT)
Files: file.ts:123, other.ts:456
Impact: high|medium|low | Pressure: XX%
```

**Example Log Entries**:

```markdown
### 14:32 - [fix]
Fixed async/await issue in loadSessionLog causing silent failures. Root cause: missing await on fs.readFile.
Files: session-logger.ts:125
Impact: high | Pressure: 35%

### 15:18 - [feature]
Implemented automatic pressure capture in logEvent(). Eliminates manual pressure tracking burden.
Files: session-logger.ts:87, session-logger.ts:428
Impact: medium | Pressure: 52%

### 16:03 - [decision]
Chose to append events incrementally vs rewriting entire file. Better performance and prevents data loss on crashes.
Files: session-logger.ts:248
Impact: high | Pressure: 68%

### 16:45 - [insight]
Discovered that Markdown parsing regex needs multiline flag for event extraction. Pattern: /### (\d{2}:\d{2}) - \[(.*?)\]/gm
Files: session-logger.ts:356
Impact: low | Pressure: 79%

### 17:20 - [achievement]
Phase 2 implementation complete with all tests passing. Ready for integration testing.
Files: session-logger.ts, session-logging.test.ts
Impact: high | Pressure: 88%
```

#### Integration with Context Reflexes

Session logging integrates seamlessly with existing Context Reflexes. When reflexes trigger, log the event:

**"Why Am I Doing This?" Reflex** → Log as decision
- Captures alignment moments and goal clarifications
- Example: "Refocused on core logging functionality. Deferred advanced pressure monitoring to Phase 3."

**"Have We Done This Before?" Reflex** → Log as insight (pattern recognition)
- Captures pattern discoveries and reuse opportunities
- Example: "This event categorization mirrors the insight types in types/session.ts. Maintaining consistency."

**"Something Feels Off" Reflex** → Log as fix or insight (gotcha)
- Captures confusion resolution and tricky issues discovered
- Example: "File paths must be absolute in Windows. Using path.join() instead of string concatenation."

**"Update My Understanding" Reflex** → Log as insight (learning)
- Captures key learnings and discoveries
- Example: "Learned that async fs operations need proper error handling. Added try-catch blocks throughout."

#### Logging Guidelines

**DO:**
- Keep descriptions to 1-2 sentences maximum
- Focus on WHY something was done, not WHAT was done
- Include file paths with line numbers when relevant
- Choose appropriate impact levels honestly
- Log immediately after the event (while context is fresh)
- Use natural language, not mechanical reporting

**DON'T:**
- Write lengthy paragraphs (defeats the purpose of concise logging)
- Log trivial actions (every file save, every minor edit)
- Duplicate information (log once per unique insight)
- Delay logging until end of session (defeats pressure mitigation)
- Include sensitive data (credentials, API keys, PII)

#### Logging in Practice

**Typical Session Flow**:

```
14:00 - Session starts (pressure: 15%)
14:32 - Fix authentication bug → Log [fix]
15:18 - Add new endpoint → Log [feature]
16:03 - Decide on caching strategy → Log [decision]
16:45 - Discover framework quirk → Log [insight]
17:20 - Tests passing → Log [achievement]
17:30 - Commit changes → Log [git]
17:45 - Call handoff (pressure: 92%)
       → Synthesize from 6 logged events
       → High-quality handoff despite high pressure
```

**Real Session Examples - Use Bash Tool**:

```bash
# After fixing a bug - include root cause and solution
ginko log "Resolved race condition in session initialization. Root cause: multiple async operations writing to same file. Added mutex lock to serialize writes." \
  --category=fix --impact=high --files="session-logger.ts:89"

# After implementing a feature - include purpose and approach
ginko log "Added archive() method to preserve completed sessions for team review. Moves current-session-log.md to archive/ with timestamp, enables session history browsing." \
  --category=feature --impact=medium --files="session-logger.ts:195,session-logger.ts:223"

# After making a decision - include alternatives and rationale
ginko log "Chose event-driven logging over periodic snapshots. Rationale: Events align with developer actions, providing meaningful context. Periodic snapshots would capture arbitrary states without semantic meaning." \
  --category=decision --impact=high

# After discovering an insight - include discovery context
ginko log "Discovered git operations require absolute paths for cross-platform compatibility. Windows path resolution differs from Unix. Using path.join() prevents platform-specific bugs." \
  --category=insight --impact=medium --files="helpers.ts:45"

# After git operations - include what changed
ginko log "Committed session logging CLI implementation (d56466f). Added ginko log command, archived outdated backlog features, completed TASK-004." \
  --category=git --impact=high

# After achievements - include significance
ginko log "All integration tests passing after session logging refactor. Validates event capture, file persistence, and handoff synthesis working end-to-end." \
  --category=achievement --impact=high
```

#### Benefits of Session Logging

1. **Higher Quality Handoffs** - Rich detail captured at low pressure (20-80%), synthesized at high pressure (90%+)
2. **Reduced Token Usage** - Synthesis requires far fewer tokens than full generation
3. **Timeline Preservation** - Exact chronology of session decisions and discoveries
4. **Team Learning** - Other developers can review session logs to understand "why"
5. **Context Continuity** - Future sessions benefit from captured insights
6. **Pressure Mitigation** - Inverts the quality curve by front-loading capture

**Quality Comparison**:

```
WITHOUT Logging:
- Handoff called at 92% pressure
- AI quality: 65% (degraded)
- Handoff quality: Generic, misses nuance
- Token cost: ~3000 tokens

WITH Logging:
- 6 events logged at 35-79% pressure
- AI quality during logging: 90-100%
- Handoff synthesized from rich logs
- Handoff quality: Detailed, preserves decisions
- Token cost: ~1500 tokens (50% savings)
```
>>>>>>> feature/adr-033-phase2-ai-protocol

### Collaboration Patterns

#### The "Vibecheck" Pattern 🎯
When you sense drift, frustration, or misalignment during collaboration, either human or AI can call for a **vibecheck**:

**Purpose**: Gentle recalibration tool to reset direction and ensure productive collaboration

**When to Use**:
- Feeling lost or confused about direction
- Noticing repeated failed attempts
- Sensing the other party is frustrated
- Major scope creep or goal shift
- Working on something that feels wrong

**How it Works**:
1. **Call it**: "I think we need a vibecheck" 
2. **Reset moment**: Pause current work
3. **Quick sync**: 
   - "What are we actually trying to achieve?"
   - "Is this the right approach?"
   - "Should we pivot?"
4. **Realign**: Agree on clear next steps or new direction
5. **Continue**: Resume with fresh perspective

**Example Vibecheck Triggers**:
- "I think we're overcomplicating this - vibecheck?"
- "This doesn't feel like it's solving the real problem - vibecheck?"
- "I'm getting confused about our priorities - vibecheck?"

**Key Principles**:
- **Non-judgmental**: No blame, just recalibration
- **Quick**: 30-60 seconds to reset direction
- **Mutual**: Either collaborator can call it
- **Productive**: Always ends with clear next action

This pattern helps catch productive drift early and keeps collaboration smooth and effective.

### Enhanced Development Methodology

Our core methodology has evolved from experience:

**INVENTORY → CONTEXT → THINK → PLAN → PRE-MORTEM → VALIDATE → ACT → TEST → RETROSPECTIVE**

#### Step 0: INVENTORY - What Already Exists (NEW!)
Before assuming you need to build something, check what's already there:
1. **Check existing structure**: `ls -la` relevant directories
2. **Find working examples**: Look for similar features already implemented
3. **Identify patterns**: How are current features built?
4. **Review configuration**: Check for `.json`, `.env`, documentation
5. **Test what works**: Try existing endpoints/features first

**⚡ AI-Optimized File Discovery (ADR-002)**:
Our codebase uses standardized frontmatter for instant context. ALWAYS use these commands first:
```bash
# Get instant file context (0.1 seconds vs minutes of reading)
head -12 path/to/file.ts

# Find files by functionality 
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "@tags:.*auth"

# Find related files instantly
grep -l "@related.*filename" **/*.ts

# Assess complexity before diving in
find . -name "*.ts" | xargs grep -l "@complexity: high"

# Find current vs deprecated code
find . -name "*.ts" | xargs grep -l "@status: current"

# Validate frontmatter coverage for quality assurance
find . -path "./src/*" -name "*.ts" -o -path "./src/*" -name "*.tsx" | xargs grep -L "@fileType:" | head -5
```

**The 2-Minute Inventory Check**:
```bash
# Before building any feature, run:
find . -name "*similar-feature*" -type f
head -12 $(find . -name "*.ts" | head -5)  # Check frontmatter first
grep -r "pattern-you-need" --include="*.ts" 
ls -la relevant/directory/
cat existing-config.json
```

This prevents rebuilding what already exists and reveals established patterns to follow.

#### Why Pre-Mortem is Critical
- Even perfect execution of a flawed plan equals failure
- 10 minutes of pre-mortem prevents hours of misdirected work
- Reveals hidden assumptions and constraints before commitment
- Differentiates "doing things right" from "doing the right things"

#### Before Any Task - The Context Phase (NEW)
1. **What CAN'T we change?** (constraints come first)
2. **What don't we have?** (missing prerequisites)
3. **What would break if we succeeded?** (downstream impacts)
4. **Can we define success in one measurable sentence?**
5. **What happened last time someone tried this?**

#### The 3V Framework
Before planning anything, evaluate:
- **VALUE**: What's the real problem? (not the symptom)
- **VIABILITY**: Do we have the tools/skills/access?
- **VULNERABILITY**: What assumptions could be wrong?

#### Success Definition Formula
```
Success = Specific Metric + Target Value + Time Boundary + Acceptance Criteria
```

Example: "Reduce npm HIGH vulnerabilities to zero by end of sprint without breaking functionality"

#### Red Flags That Demand Pre-Mortem
- "Just update the dependencies"
- "Should be a quick fix"
- "Works on my machine"
- "The docs say it's easy"

#### Quick Pre-Mortem Questions
1. "What if the obvious solution doesn't work?"
2. "What are we assuming that might be false?"
3. "If this fails spectacularly, what was the cause?"
4. "What's the stupid thing that will break this?"

See `/docs/PLANNING-TEMPLATE.md` and `/docs/CONTEXT-GATHERING-CHECKLIST.md` for detailed frameworks.

### Context Discovery Patterns
- **Session context**: `.ginko/sessions/[user]/current.md`
- **Context modules**: `.ginko/context/modules/*.md`
- **Team patterns**: Found in existing code via `head -12` frontmatter
- **Best practices**: Documented in `.ginko/context/modules/`
- **Project structure**: Use `ls -la` and `find` commands
- **Recent activity**: Check git log and `.ginko/sessions/` archives

### File Creation Workflow

When creating any new TypeScript/JavaScript file, follow this exact sequence:

#### 1. Create File with Frontmatter Template
```typescript
/**
 * @fileType: [appropriate-type]
 * @status: current
 * @updated: $(date +%Y-%m-%d)
 * @tags: [key, functionality, words]
 * @related: [existing-files.ts, that-connect.tsx]
 * @priority: [critical|high|medium|low]
 * @complexity: [low|medium|high]
 * @dependencies: [packages, used]
 */

// Your actual code starts here
```

#### 2. Determine File Type
- **component**: React components (`MyComponent.tsx`)
- **page**: Next.js pages (`src/app/*/page.tsx`)
- **api-route**: API endpoints (`src/app/api/*/route.ts`)
- **hook**: React hooks (`use*.ts`)
- **utility**: Helper functions (`utils/*.ts`)
- **provider**: Context providers (`*Provider.tsx`)
- **model**: Types/interfaces (`types/*.ts`)
- **config**: Configuration (`*.config.js`)

#### 3. Smart Tag Selection
Choose tags that enable discovery:
- **Functional**: `auth`, `api`, `ui`, `data`
- **Technical**: `react`, `nextjs`, `supabase`, `stripe`
- **Purpose**: `critical-path`, `user-facing`, `internal`

#### 4. Validate Frontmatter
Before committing, verify:
```bash
head -12 your-new-file.ts  # Should show complete metadata
find . -name "your-new-file.ts" | xargs grep -l "@fileType:"  # Should return file
```

**Enforcement**: All pull requests should include frontmatter validation. Files without proper frontmatter will slow down development velocity.

## Workspace-Specific Development

### 🚀 Quick Workspace Navigation
When working in specific directories, use these contextual guides:

- **`api/`** - Serverless MCP functions → See `api/CLAUDE.md`
- **`dashboard/`** - Next.js collaboration app → See `dashboard/CLAUDE.md`  
- **`mcp-client/`** - CLI tools & NPM package → See `mcp-client/CLAUDE.md`
- **`evals/`** - Python testing framework → See `evals/CLAUDE.md`
- **`scripts/`** - Automation & utilities → See `scripts/CLAUDE.md`

Each workspace CLAUDE.md contains:
- Local development patterns and setup
- Architecture-specific conventions
- Testing and debugging approaches
- Common tasks and workflows

## Project-Specific Context

### Ginko Architecture
This project implements an MCP (Model Context Protocol) server for intelligent context management with:
- **Serverless Architecture**: Pure Vercel deployment with API routes
- **Database Persistence**: Supabase PostgreSQL for production persistence
- **Git Integration**: Webhook processing for automatic context updates
- **Best Practices System**: Team-level development standards and guidance
- **Smart Context Caching**: Intelligent invalidation and refresh strategies

### Key Components
- `api/mcp/tools/call.ts` - Primary serverless MCP implementation (21 tools)
- `src/database.ts` - Database abstraction with connection pooling
- `src/session-handoff.ts` - Session capture and resumption system
- `src/best-practices.ts` - Team best practices management
- `src/git-integration.ts` - Git webhook processing and analysis
- `src/context-manager.ts` - Core context analysis and generation

### Development Workflow
1. **Test locally first**: `npm run build && npm test`
2. **Deploy to Vercel for testing**: `vercel --prod` or use live endpoints
3. **Follow database-first design**: All features should work with and without DB
4. **Pure serverless architecture**: All functionality via Vercel API routes
5. **Update BACKLOG.md**: Document new feature architectures before implementation

### Testing the Context System
```bash
# Test with ginko CLI (git-native approach)
ginko start                    # Begin or resume session
ginko context                  # List available context modules
ginko context auth            # Load specific module
ginko handoff "work summary"  # Save progress for next session

# Check context files directly
ls -la .ginko/context/modules/
head -12 .ginko/sessions/*/current.md
```

### Environment Setup
- **Node.js**: v18+ required for MCP SDK compatibility
- **PostgreSQL**: Optional for persistence (graceful fallback available)
- **MCP Configuration**: Uses `.mcp.json` for Claude Code integration

Remember: The server automatically falls back to in-memory storage with full functionality when PostgreSQL is unavailable - this is expected and designed behavior.

## Session Logging Best Practices (ADR-033)

### Overview

Continuous session logging captures insights at low context pressure (20-80%), enabling high-quality handoffs even when called under high pressure (85-100%). This inverts the quality curve and preserves insights that would otherwise be lost to context pressure degradation.

### When to Log

Log events after significant milestones:

**File Modifications**
- After implementing a feature
- After refactoring code
- When changing multiple files

**Bug Fixes**
- After identifying root cause
- After implementing solution
- After verifying fix

**Key Decisions**
- Architecture choices
- Library/framework selection
- Trade-off decisions
- Alternative approaches considered

**Insights**
- Performance gotchas discovered
- API quirks encountered
- Best practices learned
- Patterns identified

**Git Operations**
- After commits
- Branch changes
- Merge operations

**Achievements**
- Features completed
- Tests passing
- Milestones reached

### How to Write Context-Rich, Valuable Entries

**The Fresh Session Test**: Write each log entry as if explaining to a new AI with ZERO context about your session. Include WHY, not just WHAT.

**Autonomous Logging via CLI**:
```bash
# Use Bash tool to call ginko log after significant events
ginko log "DESCRIPTION" --category=CATEGORY --impact=IMPACT --files="file.ts:lines"
```

**Quality Examples - Write for Future Context**:

**Fix - Include Root Cause:**
```bash
ginko log "Fixed authentication timeout in login flow. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11 for 200ms response time while maintaining security standards." \
  --category=fix --impact=high --files="src/auth/login.ts:42-50"
```

**Decision - Include Rationale:**
```bash
ginko log "Chose JWT with refresh tokens over server-side sessions. Rationale: stateless scaling for mobile clients. Trade-off: increased token management complexity vs simplified server architecture." \
  --category=decision --impact=high
```

**Feature - Include Purpose:**
```bash
ginko log "Implemented session logging CLI command to enable defensive logging during development. Addresses ADR-033 by providing user/AI interface to log events throughout session." \
  --category=feature --impact=high --files="packages/cli/src/commands/log.ts,packages/cli/src/index.ts"
```

**Insight - Include Context:**
```bash
ginko log "Discovered bcrypt rounds 10-11 provide optimal security/performance balance. Testing showed rounds 15 caused 800ms login delays; rounds 11 achieved 200ms with acceptable entropy." \
  --category=insight --impact=medium --files="src/auth/password.ts:23"
```

**Bad Examples - Too Vague for Handoff:**

```bash
# DON'T: No context, no value to fresh AI
ginko log "Fixed auth" --category=fix

# DON'T: Missing WHY
ginko log "Updated login function" --category=feature

# DON'T: No actionable information
ginko log "Made a decision about sessions" --category=decision
```

### Autonomous Logging in Practice

**Silent Operation**: Logging happens automatically via the "Defensive Logging" reflex. Don't interrupt conversation flow to announce logging unless contextually relevant.

**Typical Pattern**:
```
Human: "We just fixed the auth timeout"
AI: [silently logs via Bash]
AI: "Great! Now let's test the login flow..."
```

**Not**:
```
Human: "We just fixed the auth timeout"
AI: "Let me log that event first..."
AI: [logs]
AI: "Okay, logged. Now let's..."
```

### Integration with Work Modes

#### Hack & Ship Mode 🚀
- **Logging Triggers**: After major changes only (fixes, features, achievements)
- **Quality Bar**: Essential context (WHAT + WHY in 1-2 sentences)
- **Example**: "Fixed login timeout. Root cause: slow bcrypt. Reduced rounds to 11."
- **Frequency**: 3-5 log entries per session

#### Think & Build Mode 🎨 (Default)
- **Logging Triggers**: After all significant events (fixes, features, decisions, insights)
- **Quality Bar**: Full context (WHAT + WHY + HOW in 2-3 sentences)
- **Example**: "Chose JWT over sessions for mobile scalability. Trade-off: token management complexity vs stateless scaling benefits."
- **Frequency**: 5-10 log entries per session

#### Deep Work Mode 🔬
- **Logging Triggers**: After every insight, decision, or discovery
- **Quality Bar**: Rich context with alternatives and rationale (2-3 detailed sentences)
- **Example**: "Discovered optimal bcrypt rounds through load testing. Rounds 15 caused 800ms delays. Rounds 11 achieved 200ms with equivalent security per OWASP standards. Documented in auth module."
- **Frequency**: 10-15 log entries per session

### Pressure-Aware Workflow

**Recommended Pattern:**

```
Session Start (5%)
    ↓
ginko start
    ↓
Work + Log (20-60%)        ← Optimal logging zone
    ↓
Check pressure (ginko status)
    ↓
Continue if < 75%
    ↓
Work + Log (60-75%)        ← Still good quality
    ↓
Check pressure again
    ↓
Complete current task (75-85%)
    ↓
ginko handoff              ← Preserve quality
    ↓
New session (5%)
```

### References

- [ADR-033: Context Pressure Mitigation Strategy](docs/adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-033 Implementation Guide](docs/adr/ADR-033-implementation-guide.md)
- [Session Logging Example](docs/examples/session-logging-example.md)
- [Context Pressure Management](docs/context-pressure-management.md)

---

*Session logging is enabled by default with `ginko start`. Use `--no-log` to disable.*
