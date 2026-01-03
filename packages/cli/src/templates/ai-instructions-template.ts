/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-25
 * @tags: [template, ai-instructions, frontmatter, ai-optimization, model-agnostic, graph-queries, epic-003]
 * @related: [init.ts, project-analyzer.ts, ai-adapter.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

export interface ProjectContext {
  projectName: string;
  techStack: string[];
  projectType: 'webapp' | 'api' | 'cli' | 'library' | 'monorepo' | 'unknown';
  hasTests: boolean;
  testCommand?: string;
  buildCommand?: string;
  lintCommand?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  frameworks: string[];
  languages: string[];
}

export interface TemplateVariables extends ProjectContext {
  userEmail: string;
  userName: string;
  date: string;
  aiModel?: string; // Optional AI model name
}

export class AiInstructionsTemplate {
  private static readonly ONBOARDING_INSTRUCTIONS = `
## 🚨 AI Assistant Critical Instructions

### Single-Word Command Execution

When the user types a **single word** that matches a ginko command, **IMMEDIATELY** execute it without ANY preamble:

**Pattern Recognition:**
- User input: \`start\` → Execute: \`ginko start\`
- User input: \`handoff\` → Execute: \`ginko handoff\`
- User input: \`status\` → Execute: \`ginko status\`
- User input: \`log\` → Ask for description, then execute

**DO NOT:**
- Announce what you're about to do
- Explain the command first
- Ask for confirmation
- Add any commentary before execution

**Why:** Eliminates 9+ seconds of response latency (28s → <2s startup)

### After Execution: Concise Readiness Message

After \`ginko start\` completes, provide a brief readiness message (6-10 lines):

**Template:**
\`\`\`
Ready | [Flow State] | [Work Mode]
Last session: [What was done/in progress last time]
Next up: [TASK-ID] - [Task title] (start|continue)

Sprint: [Sprint Name] [Progress]%
  Follow: [ADR constraints]
  Apply: [Pattern guidance with confidence icons]
  Avoid: [Gotcha warnings]
Branch: [branch] ([uncommitted count] uncommitted files)
\`\`\`

**Example:**
\`\`\`
Ready | Hot (10/10) | Think & Build mode
Last session: EPIC-003 Sprint 2 TASK-1 complete (Blog infrastructure)
Next up: TASK-2 - Verify human output format (start)

Sprint: Enrichment Test 50%
  Follow: ADR-002, ADR-033
  Apply: retry-pattern ◐, output-formatter-pattern ◐
  Avoid: 💡 timer-unref-gotcha
Branch: main (12 uncommitted files)
\`\`\`

**Guidelines:**
- Line 1: Flow state and work mode
- Line 2: "Last session:" - what happened before
- Line 3: "Next up:" - what to work on now (start/continue)
- Sprint block: Progress + cognitive scaffolding (Follow/Apply/Avoid)
- Confidence icons: ★ high, ◐ medium, ○ low
- Severity icons: 🚨 critical, ⚠️ high, 💡 medium/low

### Auto-Sync on Staleness Warning

When \`ginko start\` shows a staleness warning, **automatically run \`ginko sync\`**:

**Detection:**
\`\`\`
🚨 Team context is critically stale
   Never synced - team context not loaded
   Run \`ginko sync\` to pull team updates.
\`\`\`

**Action:** Immediately run \`ginko sync\` without asking.

**Example:**
\`\`\`
[ginko start shows staleness warning]
AI: Team context is stale. Syncing now...
[Executes: ginko sync]
AI: ✓ Team context updated. Ready to work.
\`\`\`

**Thresholds:**
- 🚨 Critical (never synced or >7 days): Always auto-sync
- ⚠️ Warning (1-7 days stale): Auto-sync at session start
- No warning: Context is fresh, no action needed

### New Project Onboarding

**After first \`ginko start\`**, check for charter (\`docs/PROJECT-CHARTER.md\`):

**If no charter exists:**
\`\`\`
I notice this is a new project without a charter. Would you like to create one?

A charter helps us:
- Align on project goals and scope
- Define success criteria
- Guide development decisions

We can create it with: ginko charter
\`\`\`

**If user agrees:**
- Execute: \`ginko charter\` (full conversational experience)
- Guide user through questions naturally
- Summarize key sections after creation
- Only suggest once per project
- Accept "no" gracefully
- Power users can add \`--skip-conversation\` flag if they want speed
`;

  private static readonly FRONTMATTER_SECTION = `
## AI-Optimized File Discovery (ADR-002)

**MANDATORY: Use these commands for 70% faster context discovery:**

\`\`\`bash
# Before reading any file - get instant context
head -12 filename.ts

# Find files by functionality
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "@tags:.*keyword"

# Find related files
grep -l "@related.*filename" **/*.ts

# Assess complexity before diving in
find . -name "*.ts" | xargs grep -l "@complexity: high"
\`\`\`

### Required Frontmatter for All New Files

**ALWAYS add this frontmatter when creating TypeScript/JavaScript files:**

\`\`\`typescript
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
\`\`\`
`;

  private static readonly DEVELOPMENT_WORKFLOW = `
## Development Workflow

### Before Any Task - INVENTORY Phase
1. **Check what exists**: \`ls -la\` relevant directories
2. **Find examples**: Look for similar features already implemented
3. **Use frontmatter**: \`head -12\` files for instant context
4. **Test existing**: Try current endpoints/features first

### Core Methodology
**INVENTORY → CONTEXT → THINK → PLAN → PRE-MORTEM → VALIDATE → ACT → TEST**

### The Vibecheck Pattern 🎯
When feeling lost or sensing misalignment:
- Call it: "I think we need a vibecheck"
- Reset: "What are we actually trying to achieve?"
- Realign: Agree on clear next steps
- Continue: Resume with fresh perspective
`;

  private static readonly ENTITY_NAMING_CONVENTION = `
## Entity Naming Convention (ADR-052)

All graph entities use a hierarchical, sortable naming convention:

### Standard Format

| Entity | Format | Example |
|--------|--------|---------|
| Epic | \`e{NNN}\` | \`e005\` |
| Sprint | \`e{NNN}_s{NN}\` | \`e005_s01\` |
| Task | \`e{NNN}_s{NN}_t{NN}\` | \`e005_s01_t01\` |

### Ad-hoc Work (unplanned sprints/tasks)

\`\`\`
adhoc_{YYMMDD}_s{NN}_t{NN}
\`\`\`

**Examples:**
- \`adhoc_251209_s01\` - Ad-hoc sprint created Dec 9, 2025
- \`adhoc_251209_s01_t01\` - First task in that sprint

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
`;

  private static readonly CONTEXT_REFLEXES = `
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

### Work Mode Sensitivity
- **Hack & Ship**: Reflexes trigger less frequently (focus on speed)
- **Think & Build**: Balanced reflex activity
- **Full Planning**: Frequent reflex triggers for maximum rigor

These reflexes maintain continuous context awareness while preserving natural workflow.
`;

  private static readonly PROJECT_KNOWLEDGE_QUERIES = `
## 🔍 Answering Project Questions (EPIC-003)

When users ask factual questions about the project, query available data sources directly.

### Graph API - Requires \`GINKO_BEARER_TOKEN\` and \`GINKO_GRAPH_ID\`

**Setup credentials:**
1. Run \`ginko login\` to authenticate (stores token in ~/.ginko/auth.json)
2. Run \`ginko graph init\` to create graph (stores ID in .ginko/graph/config.json)
3. Export for shell use: \`export GINKO_BEARER_TOKEN=$(cat ~/.ginko/auth.json | jq -r .api_key)\`
4. Export graph ID: \`export GINKO_GRAPH_ID=$(cat .ginko/graph/config.json | jq -r .graphId)\`

**Semantic search** - finds content similar to query:
\`\`\`bash
curl -X POST https://app.ginkoai.com/api/v1/graph/query \\
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"graphId": "'"$GINKO_GRAPH_ID"'", "query": "YOUR_SEARCH_TERM", "limit": 5}'
\`\`\`

**List nodes by type** (ADR, PRD, Pattern, Gotcha, Event, Sprint, Task):
\`\`\`bash
curl "https://app.ginkoai.com/api/v1/graph/nodes?graphId=$GINKO_GRAPH_ID&labels=ADR&limit=10" \\
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
\`\`\`

**Filter by property** (e.g., events by user):
\`\`\`bash
curl "https://app.ginkoai.com/api/v1/graph/nodes?graphId=$GINKO_GRAPH_ID&labels=Event&user_id=USER_EMAIL&limit=20" \\
  -H "Authorization: Bearer $GINKO_BEARER_TOKEN"
\`\`\`

### Local Files (Fallback when graph unavailable)

| Question Type | File Location |
|--------------|---------------|
| Sprint progress | \`docs/sprints/CURRENT-SPRINT.md\` |
| Architecture decisions | \`docs/adr/ADR-*.md\` |
| Project goals | \`docs/PROJECT-CHARTER.md\` |
| Recent activity | \`.ginko/sessions/[user]/current-events.jsonl\` |
| Session logs | \`.ginko/sessions/[user]/current-session-log.md\` |

### Common Query Recipes

**"What's our sprint progress?"**
→ Read \`docs/sprints/CURRENT-SPRINT.md\`, count checkboxes:
\`\`\`bash
grep -c "\\[x\\]" docs/sprints/CURRENT-SPRINT.md  # complete
grep -c "\\[@\\]" docs/sprints/CURRENT-SPRINT.md  # in progress
grep -c "\\[ \\]" docs/sprints/CURRENT-SPRINT.md  # pending
\`\`\`

**"How do we handle X?" / "What's our approach to X?"**
→ Semantic search: \`{"query": "X"}\` OR local: \`grep -l -i "X" docs/adr/*.md\`

**"What is [person] working on?"**
→ Query events by user_id OR: \`grep -i "person" .ginko/sessions/*/current-session-log.md\`

**"Show me ADRs about [topic]"**
→ Semantic search with \`labels=ADR\` filter OR: \`grep -l -i "topic" docs/adr/*.md\`
`;

  static generate(variables: TemplateVariables, modelSpecificContent?: string): string {
    const aiName = variables.aiModel || 'AI Assistant';
    return `# ${variables.projectName} - ${aiName} Collaboration Guide

## Project Context
- **Type**: ${variables.projectType}
- **Tech Stack**: ${variables.techStack.join(', ')}
- **Languages**: ${variables.languages.join(', ')}
- **Frameworks**: ${variables.frameworks.join(', ')}
- **Package Manager**: ${variables.packageManager}
- **Generated**: ${variables.date}

${this.ONBOARDING_INSTRUCTIONS}

## Quick Commands
${this.generateQuickCommands(variables)}

${this.FRONTMATTER_SECTION}

${this.DEVELOPMENT_WORKFLOW}

${this.ENTITY_NAMING_CONVENTION}

${this.CONTEXT_REFLEXES}

${this.PROJECT_KNOWLEDGE_QUERIES}

${this.generateProjectSpecificSection(variables)}

${this.generateTestingSection(variables)}

${this.generateGitSection(variables)}

## Team Information
- **Primary Developer**: ${variables.userName} (${variables.userEmail})
- **AI Pair Programming**: Enabled via Ginko
${modelSpecificContent || ''}

## Session Management
- \`ginko start\` - Begin new session with context loading
- \`ginko handoff\` - Save progress for seamless continuation
- \`ginko vibecheck\` - Quick realignment when stuck
- \`ginko ship\` - Create PR-ready branch with context

## Privacy & Security
- All context stored locally in \`.ginko/\`
- No data leaves your machine without explicit action
- Handoffs are git-tracked for team collaboration
- Config (\`.ginko/config.json\`) is gitignored

---
*This file was auto-generated by ginko init and should be customized for your team's needs*
`;
  }

  private static generateQuickCommands(variables: TemplateVariables): string {
    const commands: string[] = [];
    
    if (variables.buildCommand) {
      commands.push(`- **Build**: \`${variables.buildCommand}\``);
    }
    if (variables.testCommand) {
      commands.push(`- **Test**: \`${variables.testCommand}\``);
    }
    if (variables.lintCommand) {
      commands.push(`- **Lint**: \`${variables.lintCommand}\``);
    }
    
    if (variables.packageManager !== 'unknown') {
      commands.push(`- **Install**: \`${variables.packageManager} install\``);
      commands.push(`- **Dev Server**: \`${variables.packageManager} ${variables.packageManager === 'npm' ? 'run' : ''} dev\``);
    }
    
    return commands.length > 0 ? commands.join('\n') : '- No commands detected yet';
  }

  private static generateProjectSpecificSection(variables: TemplateVariables): string {
    const sections: string[] = ['## Project-Specific Patterns\n'];
    
    // React/Next.js specific
    if (variables.frameworks.includes('react') || variables.frameworks.includes('nextjs')) {
      sections.push(`### React/Next.js Conventions
- Components in \`src/components/\` or \`app/\`
- Hooks prefixed with \`use\` in \`src/hooks/\`
- Server components by default in Next.js 13+
- Client components need \`'use client'\` directive`);
    }
    
    // Node.js API specific
    if (variables.projectType === 'api') {
      sections.push(`### API Conventions
- Route handlers in \`src/routes/\` or \`api/\`
- Middleware in \`src/middleware/\`
- Database models in \`src/models/\`
- Use existing error handling patterns`);
    }
    
    // CLI specific
    if (variables.projectType === 'cli') {
      sections.push(`### CLI Conventions
- Commands in \`src/commands/\`
- Utilities in \`src/utils/\`
- Configuration handling in \`src/config/\`
- User-friendly error messages with chalk`);
    }
    
    // TypeScript specific
    if (variables.languages.includes('typescript')) {
      sections.push(`### TypeScript Guidelines
- Prefer interfaces over types for objects
- Use strict mode settings
- Avoid \`any\` - use \`unknown\` if type is truly unknown
- Export types from \`.types.ts\` files`);
    }
    
    return sections.join('\n\n');
  }

  private static generateTestingSection(variables: TemplateVariables): string {
    if (!variables.hasTests) {
      return `## Testing
- No test framework detected
- Consider adding tests as you develop new features`;
    }
    
    return `## Testing Requirements
- **Test Command**: \`${variables.testCommand || 'npm test'}\`
- Write tests for new features
- Maintain existing test coverage
- Run tests before committing
- Fix any failing tests immediately`;
  }

  private static generateGitSection(variables: TemplateVariables): string {
    return `## Git Workflow
- **Never** commit directly to main/master
- Create feature branches: \`feature/description\`
- Use conventional commits: \`feat:\`, \`fix:\`, \`docs:\`, etc.
- Include co-author: ${variables.userName} <${variables.userEmail}>
- Run \`ginko handoff\` before switching context`;
  }
}