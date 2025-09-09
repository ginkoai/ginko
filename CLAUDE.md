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