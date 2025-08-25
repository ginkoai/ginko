# ADR-018: Collaborative Slash Commands with Safety Guardrails

**Date:** 2025-08-12  
**Status:** Accepted  
**Deciders:** Chris Norton, Claude Code Team  

## Context

Claude Code supports custom slash commands via markdown files in `.claude/commands/`. We needed to improve the developer experience for common workflows like context loading, session handoffs, and code shipping while maintaining quality and safety.

## Decision

We will implement a **collaborative command ecosystem** with the following principles:

### 1. Conversational Flexibility Pattern

All commands use the flexible argument pattern:
```markdown
Perform the main task.

**Consider these user comments**: $ARGUMENTS
Seek clarification if necessary.
```

This enables natural language interaction like:
- `/handoff need to leave, auth is working but needs error handling`
- `/ship this is just a prototype for feedback`
- `/vibecheck this feels like we're overcomplicating things`

### 2. Command Chaining for Safety

Commands automatically call `/vibecheck` when they detect inappropriate usage:

- **`/quick`** → `/vibecheck` for complex tasks
- **`/handoff`** → `/vibecheck` for broken states  
- **`/ship`** → `/vibecheck` for failing tests
- **`/debug`** → `/vibecheck` for scope creep

### 3. Collaborative Partnership Model

- **AI contributes**: Pattern recognition, systematic checks, detail memory
- **Human contributes**: Strategic thinking, business context, final decisions
- **Shared accountability**: Both parties responsible for outcomes
- **Mutual respect**: AI surfaces concerns, human decides action

### 4. Command Ecosystem

Core commands implemented:

- **`/start`** - Load project context and resume session
- **`/handoff`** - Clean session handoff with safety checks
- **`/ship`** - Create PR with pre-flight validation
- **`/vibecheck`** - Recalibration and direction assessment
- **`/quick`** - Simple tasks with complexity detection
- **`/debug`** - Contextual problem diagnosis

## Rationale

### Why Custom Commands?

1. **Zero Installation**: Just markdown files, work immediately after git clone
2. **Team Consistency**: Everyone gets same workflows, versioned in git
3. **Transparency**: Commands are readable, no proprietary secrets exposed
4. **Flexibility**: Arguments enable natural language interaction

### Why Safety Guardrails?

Traditional AI tools execute blindly. This creates **collaborative intelligence** where:

- Commands understand their appropriate scope
- Automatic escalation prevents common mistakes  
- AI becomes thoughtful colleague, not just smart tool
- Preserves human agency while adding systematic oversight

### Why Vibecheck Pattern?

Inspired by our "vibecheck" collaboration pattern, implemented at two levels:

**`/vibecheck` (Formal Command)**:
- Structured markdown template with systematic assessment
- Used by other commands for safety checks
- More procedural: "stop, formal assessment needed"
- Appropriate for potential risks or major direction changes

**`vibecheck` (Conversational)**:
- Natural AI response to the word in context
- Gentle colleague suggestion for course correction
- More organic: "hey, let's pause and think about this"
- Perfect for subtle realignments and collaborative moments

Both approaches are:
- **Non-judgmental**: No blame, just recalibration
- **Quick**: 30-60 seconds to reset direction
- **Mutual**: Either party can trigger
- **Productive**: Always ends with clear next action

## Implementation

### File Structure
```
.claude/
├── commands/
│   ├── start.md         # Context loading
│   ├── handoff.md       # Session handoff with safety
│   ├── ship.md          # PR creation with validation
│   ├── vibecheck.md     # Direction recalibration
│   ├── quick.md         # Simple tasks with escalation
│   └── debug.md         # Problem diagnosis
├── settings.json        # Hook configuration
└── load-context.js      # SessionStart reminder
```

### Command Chaining Example
```
/quick rewrite entire codebase in Rust
→ Claude detects complexity mismatch
→ Calls /vibecheck automatically (formal)
→ [Full structured assessment template loads]
→ Recalibrates scope and suggests proper approach
```

### Safety Check Example  
```
/ship ready to deploy
→ Claude detects failing tests
→ Calls /vibecheck for assessment (formal)
→ "Should we fix tests first, or is this a draft PR?"
```

### Conversational Vibecheck Example
```
Chris: Maybe we should refactor all the authentication
Claude: Vibecheck - that sounds like a big architectural change. 
Are we trying to solve a specific auth problem, or is this more exploratory?
```

### Dual Usage Pattern
The system supports both formal procedural checks (`/vibecheck`) and organic conversational moments (`vibecheck`), allowing for appropriate escalation based on context and severity.

## Consequences

### Positive
- **Improved DX**: Common workflows streamlined
- **Error Prevention**: Safety checks catch problems early
- **Team Alignment**: Consistent workflows across team
- **Collaborative Culture**: AI-human partnership model
- **Zero Maintenance**: No installation, updates, or dependencies

### Considerations
- **Learning Curve**: Team needs to learn command ecosystem
- **Command Proliferation**: Must avoid creating too many commands
- **Consistency**: All commands should follow established patterns

## Alternatives Considered

1. **Auto-execution without safety checks**: Rejected - too risky
2. **Rigid command syntax**: Rejected - not conversational enough  
3. **External CLI tools**: Rejected - adds installation complexity
4. **Hooks-only approach**: Rejected - can't execute other commands

## Success Metrics

- **Adoption**: Team actively uses custom commands
- **Safety**: Reduction in broken handoffs and failed deployments
- **Efficiency**: Faster context loading and session transitions
- **Quality**: Improved commit messages and PR descriptions

---

*This ADR documents our shift from traditional tool-based AI interaction to true collaborative partnership with intelligent guardrails.*