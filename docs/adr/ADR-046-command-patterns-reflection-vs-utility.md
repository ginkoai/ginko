---
type: decision
status: proposed
updated: 2025-11-18
tags: [architecture, cli, command-patterns, ai-ux, reflection, utility]
related: [ADR-032-core-cli-architecture-and-reflection-system.md, ADR-033-context-pressure-mitigation-strategy.md, CLAUDE.md]
priority: critical
audience: [developer, ai-agent]
estimated-read: 12-min
dependencies: [ADR-032, ADR-033]
---

# ADR-046: Command Patterns - Reflection vs. Utility

**Status:** Proposed
**Date:** 2025-11-18
**Authors:** Claude (AI Partner), Chris Norton
**Reviewers:** [To be assigned]
**Related:** ADR-032 (Core CLI Architecture), ADR-033 (Defensive Logging)

## Context

### Problem Statement

UAT testing of v1.4.13 revealed that AI partners are not generating events during development sessions, resulting in empty session logs despite active work. Investigation revealed two root causes:

1. **Interactive prompts block AI execution** - `ginko log` has 2-3 blocking prompts (file inclusion, quality warnings, context module creation) that AI partners cannot handle
2. **Unclear command pattern guidance** - No architectural clarity on when commands should use the Reflection Pattern (template-driven, round-trip synthesis) vs. a simpler execution model

This ambiguity creates:
- **Implementation inconsistency** - Some commands use reflection machinery, others don't
- **Performance uncertainty** - Unclear when round-trip overhead is justified
- **Developer confusion** - No clear guidelines for new command development
- **AI-UX gaps** - Commands designed for human interactivity block AI partners

### Business Context

Ginko is an **AI-first development tool** where humans rarely interact with CLI commands directly. The primary users are AI development partners (Claude, GPT-4, etc.) working alongside human developers. Commands must be optimized for:

- **AI execution speed** (minimize latency in AI workflow)
- **Flow state preservation** (no blocking prompts that interrupt AI work)
- **Educational feedback** (AI learns patterns from command output)
- **Context awareness** (AI has deep knowledge to make intelligent decisions)

### Technical Context

ADR-032 established the Universal Reflection Pattern for commands like `start`, `handoff`, and `charter`:

```
AI calls command → CLI outputs template → AI synthesizes content → CLI stores
```

However, not all commands fit this pattern. Some commands (like `log`, `status`, `config`) have simpler needs:

```
AI determines parameters → AI calls command → CLI executes → CLI confirms
```

Current codebase shows pattern fragmentation:
- `ginko start` extends `ReflectionCommand` ✓
- `ginko handoff` extends `ReflectionCommand` ✓
- `ginko charter` uses reflection-style template output ✓
- `ginko log` uses `prompts` with blocking dialogs ❌
- `ginko status` simple query function (no pattern) ❓

### Key Requirements

1. **Clear decision criteria** for when to use Reflection vs. simpler patterns
2. **AI-first UX principles** for all command interactions
3. **Consistency enforcement** without forcing inappropriate patterns
4. **Performance optimization** for frequent operations (5-10x per session)
5. **Educational feedback** embedded in all command outputs
6. **Architectural guidelines** for future command development

## Decision

We will establish **two distinct command patterns** with clear boundaries:

1. **Reflection Commands** - Template-driven synthesis for complex, multi-source artifact creation
2. **Utility Commands** - Direct execution with intelligent defaults for frequent, single-responsibility operations

Both patterns share:
- **AI-first UX principles** (no blocking prompts, smart defaults, educational output)
- **Shared infrastructure** (quality analysis, context gathering, storage managers)
- **Consistent output format** (educational feedback, pattern teaching)

### Pattern Selection Criteria

**Use Reflection Pattern when:**
- AI must **CREATE** structured artifacts through multi-source synthesis
- Multiple context sources require reasoning and integration
- Template-driven output with quality evaluation needed
- Infrequent, high-value operations (1-3x per session)
- **Examples:** `start`, `handoff`, `charter`, `context create`

**Use Utility Pattern when:**
- AI must **STORE/RETRIEVE/EXECUTE** with known parameters
- Parameters determined by AI from immediate context
- Frequent, low-friction operations (5-10x per session)
- Single responsibility (CRUD, config, status queries)
- **Examples:** `log`, `status`, `config`, `init`, `login`

## Architecture

### Reflection Command Pattern (ADR-032)

```
┌─────────────────────────────────────────────────────────┐
│ AI Partner (Context-Rich Environment)                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 1. AI calls: ginko charter
                  ▼
┌─────────────────────────────────────────────────────────┐
│ CLI: Reflection Command                                 │
│ - Loads template from templates/charter-template.md    │
│ - Outputs instructions + questions to stdout            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 2. Template + Instructions (stdout)
                  ▼
┌─────────────────────────────────────────────────────────┐
│ AI Partner                                              │
│ - Reads template                                        │
│ - Gathers context from files, git, conversation         │
│ - Reasons through template sections                     │
│ - Synthesizes complete artifact                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 3. Natural conversation with human
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Human Developer                                         │
│ - Answers AI's questions                                │
│ - Provides preferences, requirements                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 4. AI creates artifact (Write tool)
                  ▼
┌─────────────────────────────────────────────────────────┐
│ File System: docs/PROJECT-CHARTER.md                    │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- Round-trip: AI → CLI → AI → Storage
- Template-driven content creation
- Multi-step synthesis with human interaction
- Quality evaluation via template rules
- High-value, deliberate operations

**Implementation:**

```typescript
// Extends ReflectionCommand base class
export class CharterReflection extends ReflectionCommand {
  async execute(intent: string): Promise<void> {
    // 1. Load template
    const template = await this.loadTemplate('charter');

    // 2. Output instructions to stdout for AI
    console.log(template.content);
    console.log(template.guidelines);

    // 3. AI reads, synthesizes, creates file
    // (no CLI involvement - AI owns the creation)
  }
}
```

### Utility Command Pattern (New)

```
┌─────────────────────────────────────────────────────────┐
│ AI Partner (Context-Rich Environment)                   │
│ - Has full conversation context                         │
│ - Knows what just happened in code                      │
│ - Can analyze git status, file changes                  │
│ - Determines all parameters upfront                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 1. AI calls with complete params:
                  │    ginko log "Fixed EventQueue timer.
                  │    Root cause: setInterval at event-queue.ts:82
                  │    kept Node.js event loop alive.
                  │    Solution: Added .unref(). Reduced startup
                  │    from 90s to 2s."
                  │    --category=fix --impact=high
                  ▼
┌─────────────────────────────────────────────────────────┐
│ CLI: Utility Command                                    │
│ 1. Validate auth (requireAuth)                          │
│ 2. Gather context (git status, session state)           │
│ 3. Detect patterns (category, impact inference)         │
│ 4. Execute operation (write to session log + events)    │
│ 5. Output educational feedback                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 2. Educational feedback (stdout)
                  │    ✓ Event logged: fix (high impact)
                  │    Quality: Excellent (WHAT+WHY+HOW present)
                  │    Files: 2 auto-included from git status
                  │    💡 Pattern learned: root cause clarity
                  ▼
┌─────────────────────────────────────────────────────────┐
│ AI Partner                                              │
│ - Reads feedback                                        │
│ - Learns quality patterns                               │
│ - Continues working (flow preserved)                    │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- One-way: AI → CLI → stdout
- AI provides all parameters
- CLI makes smart decisions from context
- Educational output teaches patterns
- Fast, frequent operations

**Implementation:**

```typescript
// Direct function, no base class
export async function logCommand(
  description: string,
  options: LogOptions
): Promise<void> {
  // 1. Validate auth
  await requireAuth('log');

  // 2. Gather context
  const gitContext = await gatherGitContext();

  // 3. Detect patterns & smart defaults
  const category = options.category || detectCategory(description);
  const impact = options.impact || detectImpact(description);
  const quality = analyzeQuality(description);

  // 4. Execute operation
  await SessionLogManager.appendEntry({
    description,
    category,
    impact,
    files: gitContext.modifiedFiles,
    quality
  });

  // 5. Educational feedback
  console.log(formatFeedback({
    action: `Event logged: ${category} (${impact} impact)`,
    quality: quality.summary,
    context: `${gitContext.modifiedFiles.length} files auto-included`,
    learning: quality.teachingMoment
  }));
}
```

### Shared Infrastructure

Both patterns leverage common utilities:

```typescript
// packages/cli/src/utils/command-helpers.ts

/**
 * Shared utilities for ALL commands (Reflection + Utility)
 */

/** Standard educational feedback formatter */
export function formatFeedback(sections: FeedbackSection[]): string;

/** Pattern detection for smart defaults */
export function detectCategory(description: string): Category | null;

/** Quality analysis (ADR-033) */
export function analyzeQuality(content: string): QualityScore;

/** Context gathering from git */
export async function gatherGitContext(): Promise<GitContext>;

/** Authentication validation */
export async function requireAuth(command: string): Promise<void>;
```

### Architectural Guidelines for Utility Commands

Since utility commands don't extend a base class, consistency is enforced through **architectural guidelines** rather than inheritance.

**File: `packages/cli/docs/UTILITY-COMMAND-PATTERN.md`**

#### Required Structure

```typescript
/**
 * 1. Frontmatter (ADR-002)
 */
/**
 * @fileType: command
 * @status: current
 * @tags: [utility-command, ...]
 * @related: [../utils/command-helpers.ts]
 * @complexity: low
 */

/**
 * 2. Imports (shared utilities)
 */
import { requireAuth, getGinkoDir } from '../utils/helpers.js';
import { detectCategory, analyzeQuality, formatFeedback } from '../utils/command-helpers.js';

/**
 * 3. Options interface
 */
interface CommandOptions {
  // Command-specific options
}

/**
 * 4. Main command function
 */
export async function commandName(
  args: string[],
  options: CommandOptions
): Promise<void> {
  // 1. Validate auth (if required)
  await requireAuth('commandName');

  // 2. Gather context (git, session, etc.)
  const context = await gatherContext();

  // 3. Detect patterns & apply smart defaults
  const enriched = applySmartDefaults(args, context);

  // 4. Execute core operation
  await performOperation(enriched);

  // 5. Output educational feedback
  console.log(formatFeedback({...}));
}

/**
 * 5. Helper functions (private)
 */
function performOperation(data: any): Promise<void> {
  // Command-specific logic
}
```

#### AI-First UX Principles

**Never:**
- ❌ Block with interactive prompts (`inquirer`, `prompts`)
- ❌ Ask AI to confirm decisions it can make from context
- ❌ Require flags to avoid prompts (`--yes`, `--quiet`)
- ❌ Output minimal confirmation ("✓ Done")

**Always:**
- ✅ Make intelligent decisions from available context
- ✅ Auto-include files from git status when relevant
- ✅ Detect patterns and infer parameters
- ✅ Provide educational feedback explaining what happened
- ✅ Teach quality patterns through examples

#### Educational Feedback Format

All utility commands output learning-oriented feedback:

```
✓ [Action completed]: [what happened]

[Pattern Detection Section]
[Context Gathered Section]
[Actions Taken Section]

💡 [Teaching moment or quality tip]
```

**Example:**

```
✓ Event logged: fix (high impact)

Quality: Excellent (WHAT+WHY+HOW present)
  - WHAT: "Fixed EventQueue timer keeping process alive"
  - WHY: "setInterval kept Node.js event loop alive"
  - HOW: "Added .unref() to allow clean exit"
  - IMPACT: "90s→2s = 98% improvement"

Files: 2 auto-included from git status
  - packages/cli/src/lib/event-queue.ts:89
  - packages/cli/src/lib/event-queue.test.ts:45

Context module: Created (high-impact fix pattern)

💡 This entry demonstrates ideal defensive logging quality.
   Continue this pattern for all fixes.
```

#### Quality Retry Loop Pattern

**Problem:** AI assistants are stateless - they don't retain learning from feedback across sessions.

**Solution:** Immediate feedback loop with retry opportunities. AI receives quality feedback and can retry within the same invocation until quality threshold is met.

**Flow:**
```
AI: ginko log "Fixed bug"
CLI: Quality 40/100 (threshold: 70). Exit code 2.
     Feedback: Missing WHY, Missing HOW

AI: [parses feedback, retries]
    ginko log "Fixed bug. Root cause: null check. Solution: Added validation."
CLI: Quality 85/100. Exit code 0. ✓ Logged!
```

**Implementation:**
```typescript
// Exit code signals
const quality = analyzeQuality(entry);
const threshold = QUALITY_THRESHOLDS[category];

if (quality.score < threshold && !options.quick && !options.force) {
  console.error(formatQualityFeedback(quality, category));
  process.exit(2); // Signal: Retry with improvements
}

// Accept and log
await writeEntry(entry);
console.log(formatSuccessFeedback(quality));
process.exit(0); // Success
```

**Category-Specific Thresholds:**
- `fix`: 70 (must explain root cause)
- `feature`: 65 (should explain problem solved)
- `decision`: 70 (must mention alternatives)
- `insight`: 60 (more flexible)
- `git`: 50 (can be terse)
- `achievement`: 55

**Escape Hatches:**
```bash
ginko log "Quick note" --quick      # Skip quality gates
ginko log "WIP" --force              # Accept low quality
```

**Benefits:**
- ✅ No statefulness required
- ✅ Quality assurance built-in
- ✅ AI learns in context of current work
- ✅ Simple implementation

**Long-Term Vision:**
Aggregate retry patterns across teams to discover common quality issues. Embed learnings as standard context modules or enhanced defaults.

**Pattern:** `retry cases → extract learnings → update standards → improved defaults`

### Command Classification

| Command | Pattern | Rationale |
|---------|---------|-----------|
| `start` | **Reflection** | Synthesizes session state, context modules, work mode, resume point from multiple sources |
| `handoff` | **Reflection** | Creates structured artifact from session accomplishments, blockers, insights, next steps |
| `charter` | **Reflection** | Multi-step conversation, 7-section synthesis with human input |
| `context create` | **Reflection** | Extracts patterns from events, creates knowledge modules |
| `log` | **Utility** | AI already wrote description, just needs validation + storage. Frequent (5-10x/session) |
| `status` | **Utility** | Simple query, return current state. No synthesis |
| `init` | **Utility** | Setup operation, minimal reasoning |
| `config` | **Utility** | CRUD operations, no synthesis |
| `vibecheck` | **Utility** | Prompts human conversation, not AI synthesis |
| `login/logout` | **Utility** | Authentication operations |

## Alternatives Considered

### Option 1: Universal Base Utility Class with Dispatcher

**Description:**
Create `UtilityCommand` base class with shared `execute()` method. All utilities extend this class. Commands registered via configuration:

```typescript
export abstract class UtilityCommand {
  abstract readonly name: string;
  abstract execute(args: string[], options: any): Promise<void>;
}

// ginko utility --action log "description"
// Aliased as: ginko log
```

**Pros:**
- Enforces consistent interface through inheritance
- Could extend via configuration rather than code
- Single execution pathway

**Cons:**
- **Performance overhead** - Dispatcher pattern adds latency
- **Configuration loading** - Requires reading config files for simple operations
- **Unnatural syntax** - `ginko utility --action log` less intuitive than `ginko log`
- **Complexity** - Base class + dispatcher + config system for simple commands
- **Not idiomatic** - Most CLI tools don't use dispatcher pattern

**Decision:** Rejected - Performance overhead and complexity not justified for simple operations

### Option 2: Force All Commands Into Reflection Pattern

**Description:**
Make every command extend `ReflectionCommand` from ADR-032. Create templates for simple operations:

```yaml
# templates/log.yml
domain: log
sections:
  - description
  - category
  - impact
```

**Pros:**
- Single unified pattern across all commands
- Predictable workflow
- Template system already exists

**Cons:**
- **Latency overhead** - Round-trip for frequent operations (5-10x per session)
- **Template sprawl** - Trivial templates for simple CRUD operations
- **Cognitive mismatch** - Using synthesis machinery for storage operations
- **Maintenance burden** - All commands require template files

**Decision:** Rejected - Reflection pattern designed for synthesis, not storage. Using it for utilities is architectural mismatch.

### Option 3: No Patterns, Implement Each Command Independently

**Description:**
No base classes, no guidelines. Each command implemented as developer sees fit.

**Pros:**
- Maximum flexibility
- No architectural constraints
- Fast implementation

**Cons:**
- **Pattern fragmentation** - Every command different
- **Inconsistent UX** - Some blocking, some not
- **Quality variance** - No shared standards
- **Maintenance nightmare** - No predictable structure

**Decision:** Rejected - Leads to the exact inconsistency we're trying to solve

## Consequences

### Positive Impacts

1. **Clear Decision Criteria**
   - Developers know when to use Reflection vs. Utility
   - New commands follow established patterns
   - Architecture remains consistent

2. **Performance Optimization**
   - Utility commands execute in single pass (no round-trip)
   - Frequent operations (log, status) stay fast
   - AI workflow latency minimized

3. **AI-First UX**
   - No blocking prompts interrupt AI work
   - Smart defaults leverage AI's context awareness
   - Educational feedback teaches patterns

4. **Consistency Without Rigidity**
   - Shared utilities enforce common behaviors
   - Guidelines provide structure without base class overhead
   - Right tool for right job

5. **Maintainability**
   - Reference implementation (`ginko log`) serves as template
   - Shared utilities centralize common logic
   - Guidelines document expectations

### Negative Impacts

1. **Two Patterns to Learn**
   - Developers must understand when to use each pattern
   - New contributors need pattern selection guidance
   - Documentation overhead

2. **Potential Fragmentation**
   - Without enforcement, utility commands could diverge
   - Requires discipline to follow guidelines
   - Code review burden to ensure consistency

3. **No Compile-Time Enforcement**
   - TypeScript can't enforce architectural guidelines
   - Relies on documentation and review process
   - Could benefit from custom linting rules (future)

### Neutral Impacts

1. **Shared Infrastructure Required**
   - Must maintain command-helpers.ts utilities
   - Both patterns depend on common code
   - Changes affect multiple commands

2. **Pattern Evolution**
   - Guidelines may need refinement over time
   - New command types might emerge
   - Pattern boundaries could shift

### Migration Strategy

**Phase 1: Fix `ginko log` (Immediate)**
1. Remove interactive prompts from log.ts
2. Implement smart defaults (auto-include files, detect category)
3. Add educational feedback output
4. Fix session log writing bug (fs.appendFile error)
5. Test with AI partner

**Phase 2: Document Patterns (Week 1)**
1. Create `docs/cli/UTILITY-COMMAND-PATTERN.md`
2. Create `docs/cli/REFLECTION-COMMAND-PATTERN.md`
3. Update CLAUDE.md with pattern examples
4. Add command classification to each command file

**Phase 3: Establish Shared Utilities (Week 2)**
1. Extract common logic to `utils/command-helpers.ts`
2. Create `formatFeedback()` utility
3. Create `detectCategory()`, `detectImpact()` utilities
4. Refactor existing commands to use shared code

**Phase 4: Enforcement (Week 3)**
1. Create PR checklist for new commands
2. Add code review guidelines
3. Consider custom ESLint rules (optional)
4. Update developer onboarding docs

## Implementation Details

### Technical Requirements

**Dependencies:**
- No new dependencies required
- Leverage existing: chalk, commander, session-log-manager

**File Structure:**
```
packages/cli/src/
├── commands/
│   ├── log.ts                    ← Utility (reference impl)
│   ├── status.ts                 ← Utility
│   ├── config.ts                 ← Utility
│   ├── start/
│   │   └── start-reflection.ts   ← Reflection
│   └── handoff/
│       └── handoff-reflection.ts ← Reflection
├── core/
│   └── reflection-pattern.ts     ← Base for Reflection commands
├── utils/
│   └── command-helpers.ts        ← Shared utilities for both patterns
└── docs/
    ├── UTILITY-COMMAND-PATTERN.md
    └── REFLECTION-COMMAND-PATTERN.md
```

### Security Considerations

**Input Validation:**
- Sanitize all user inputs before storage
- Validate file paths against directory traversal
- Escape special characters in descriptions

**Context Gathering:**
- Respect .gitignore for file inclusion
- Don't auto-include sensitive files (.env, credentials)
- Validate git context before operations

**Educational Feedback:**
- Don't expose sensitive data in stdout
- Sanitize file paths in feedback
- Avoid leaking system details

### Performance Implications

**Utility Commands:**
- Target: < 500ms execution time
- Single-pass execution (no round-trip)
- Minimal file system operations

**Reflection Commands:**
- Target: < 2s for template output
- Round-trip acceptable for synthesis operations
- Human-in-loop so latency less critical

**Shared Utilities:**
- Cache git context within command execution
- Lazy-load quality analysis only when needed
- Optimize pattern detection (precompiled regex)

### Operational Impact

**Development Workflow:**
- New commands follow clear patterns
- Reference implementation reduces decision paralysis
- Shared utilities reduce code duplication

**Testing Strategy:**
- Unit tests for shared utilities
- Integration tests for each command
- E2E tests with AI partner (UAT)

**Documentation:**
- Pattern selection guide in docs/cli/
- Examples in each command file
- CLAUDE.md updated with AI instructions

## Monitoring and Success Metrics

### Key Performance Indicators

1. **Command Execution Time**
   - Utility commands: < 500ms (p95)
   - Reflection commands: < 2s for template output (p95)

2. **AI Event Generation Rate**
   - Target: 5-10 events per session (Think & Build mode)
   - Measure: Events logged / session hour
   - Success: ≥ 5 events/session

3. **Session Log Quality**
   - Target: 80% of events score ≥ 70 (quality threshold)
   - Measure: Average quality score across all events
   - Success: ≥ 75% meet quality standard

4. **Code Consistency**
   - Target: 100% of utility commands follow pattern
   - Measure: Code review findings
   - Success: 0 pattern violations in new PRs

### Success Criteria

**Technical Success:**
- ✓ All utility commands execute without blocking prompts
- ✓ `ginko log` generates events during AI sessions
- ✓ Session logs contain rich context (WHAT+WHY+HOW)
- ✓ Educational feedback improves AI logging quality over time

**Developer Experience Success:**
- ✓ Developers can classify new commands without ambiguity
- ✓ Reference implementation accelerates new command development
- ✓ Code reviews catch pattern violations
- ✓ No confusion about when to use each pattern

**AI Partner Success:**
- ✓ Zero blocking prompts in AI workflow
- ✓ Events logged automatically during development
- ✓ AI learns quality patterns from feedback
- ✓ Session resumption works with rich context

### Failure Criteria

**Indicators we need to revisit:**
- Utility commands start requiring round-trip synthesis
- Event generation rate < 3 per session
- Quality scores consistently < 60%
- Pattern violations in > 20% of new commands
- AI partners still confused about command usage

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Pattern fragmentation without base class | Medium | Medium | Create comprehensive guidelines doc, reference implementation, code review checklist |
| Shared utilities create coupling | Low | Low | Keep utilities focused, version shared code carefully, maintain backward compatibility |
| Guidelines ignored by developers | High | Medium | Add to PR template, code review enforcement, consider custom lint rules |
| Performance regression in utilities | Medium | Low | Set performance budgets, add benchmarks, monitor execution time |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Increased development time (two patterns) | Low | Medium | Reference implementations reduce friction, guidelines accelerate decisions |
| Inconsistent AI experience | High | Low | Enforce AI-first UX principles across both patterns, shared feedback utilities |
| Documentation maintenance burden | Medium | Medium | Keep docs close to code, update during implementation, make it part of PR process |

## Timeline and Milestones

### Implementation Phases

- **Phase 1** (Week 1): Fix `ginko log` + core utilities
  - Remove blocking prompts from log.ts
  - Implement smart defaults and educational feedback
  - Fix session log writing bug
  - Create command-helpers.ts with shared utilities
  - UAT testing with AI partner

- **Phase 2** (Week 2): Documentation + Guidelines
  - Create UTILITY-COMMAND-PATTERN.md
  - Create REFLECTION-COMMAND-PATTERN.md
  - Update CLAUDE.md with pattern examples
  - Add command classification to existing files

- **Phase 3** (Week 3): Migration + Enforcement
  - Refactor remaining utility commands (status, config)
  - Create PR checklist and code review guidelines
  - Update developer onboarding documentation
  - Consider custom ESLint rules (optional)

### Key Milestones

- **Milestone 1** (2025-11-25): `ginko log` working with AI partners
  - Zero blocking prompts
  - Educational feedback implemented
  - Event generation validated in UAT

- **Milestone 2** (2025-12-02): Pattern documentation complete
  - Guidelines published
  - Examples in CLAUDE.md
  - Reference implementation documented

- **Milestone 3** (2025-12-09): All commands classified and migrated
  - 100% of commands follow appropriate pattern
  - Code review process established
  - Success metrics baseline established

## Review and Updates

### Review Schedule

- **Initial review:** After Phase 1 completion (validate approach with real usage)
- **Pattern refinement:** After 5 new commands implemented using guidelines
- **Architecture review:** Quarterly (Q1 2026) to assess pattern effectiveness
- **Triggered reviews:** If failure criteria met or major issues discovered

### Update History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-18 | Claude + Chris Norton | Initial version from UAT feedback and architectural discussion |

## References

### Documentation
- [ADR-032: Core CLI Architecture and Reflection System](./ADR-032-core-cli-architecture-and-reflection-system.md)
- [ADR-033: Context Pressure Mitigation Strategy](./ADR-033-context-pressure-mitigation-strategy.md)
- [CLAUDE.md: AI Assistant Instructions](../../CLAUDE.md)

### External References
- [CLI Design Patterns](https://clig.dev/) - Modern CLI best practices
- [AI-First UX Principles](https://anthropic.com/ai-ux) - Designing for AI agents

### Code References
- Reference implementation: `packages/cli/src/commands/log.ts`
- Reflection base class: `packages/cli/src/core/reflection-pattern.ts`
- Shared utilities: `packages/cli/src/utils/command-helpers.ts`
- Quality analysis: `packages/cli/src/utils/log-quality.ts`
- Session log manager: `packages/cli/src/core/session-log-manager.ts`

---

**Implementation Note:** This ADR establishes architectural patterns for CLI commands. The first implementation will be `ginko log` as a reference utility command, followed by documentation and migration of remaining commands.
