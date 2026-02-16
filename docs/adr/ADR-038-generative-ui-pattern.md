# ADR-038: Generative UI Pattern for AI-Mediated Tools

**Status**: Accepted
**Date**: 2025-10-23
**Authors**: Chris Norton, Claude (AI Assistant)
**Related**: ADR-033 (Context Pressure Mitigation), ADR-036 (Session Synthesis Architecture)

## Context

### The AI-Mediated Tool Problem

Ginko is primarily a tool that an **AI partner** uses to perform imperative tasks when collaborating with a human. Traditional CLI design assumes direct human interaction at the terminal, but in AI-mediated workflows:

**Traditional Pattern (Broken)**:
```
Human: "Ship this with docs"
AI: [calls ginko ship --docs]
Command: "What version?" [blocks waiting for stdin]
<stuck - human isn't at terminal, can't respond>
```

**Problems**:
- Interactive prompts break AI-human collaboration
- Human isn't at the terminal to respond to stdin
- AI can't intermediate the dialogue
- Flow state disrupted by context switching

### The Deeper Challenge: Accountability in AI Partnerships

In Human+AI partnerships, **the human bears full accountability** for decisions and outcomes. Yet AI capabilities create a tendency toward passive acceptance:

1. **Accountability Gap**: AI suggests, human accepts without understanding
2. **Audit Trail Absence**: No record of what human actually decided
3. **Focus Drift**: Humans become lax, accepting suggestions without consideration
4. **Flow State Disruption**: Too many interruptions break concentration

**Core Insight**: We need interfaces that preserve human agency and accountability while maintaining flow state and leveraging AI intelligence.

## Decision

We adopt the **Generative UI Pattern**: a three-phase protocol where tools expose structured requirements as JSON schemas, AI brokers natural language dialogue with humans, then executes declaratively.

### The Three-Phase Protocol

```bash
# Phase 1: DISCOVER - What's needed?
ginko ship --docs --dry-run
→ Returns JSON schema with fields, context, suggestions, constraints

# Phase 2: DIALOGUE - AI ↔ Human decide
AI: Interprets schema, asks natural questions
Human: Responds in natural language with decisions
AI: Validates, clarifies, confirms understanding

# Phase 3: EXECUTE - Declarative call
ginko ship --docs --version=1.2.0 --changelog="..." --tasks="TASK-009:complete"
→ No prompts, just execution with audit trail
```

## Principles

### 1. Accountability: Human Decision, AI Assistance

**Principle**: The human must understand and explicitly approve all key decisions.

**Implementation**:
- Schema identifies fields requiring human judgment
- AI explains implications of choices
- Human provides explicit values (not just "yes")
- Audit log captures human's exact input

**Example**:
```
❌ Bad:
AI: "Should I ship version 1.2.0?"
Human: "Yes"
[No understanding demonstrated]

✅ Good:
AI: "We removed a feature (handoff) but added new ones (ship --docs).
     Should this be 1.2.0 (minor) or 2.0.0 (major)?"
Human: "1.2.0 - the new ship features offset the removal"
[Human demonstrates understanding of versioning]
```

### 2. Audit Trails: Capture Human Intent

**Principle**: Schema-based dialogues create timestamped records of human decisions.

**Implementation**:
- Every schema-driven execution logs inputs
- Human choices captured with context
- AI suggestions distinguished from human decisions
- Audit log enables accountability review

**Audit Entry**:
```json
{
  "timestamp": "2025-10-23T16:04:41Z",
  "command": "ginko ship --docs",
  "schema_version": "1.0",
  "human_decisions": {
    "version": {
      "value": "1.2.0",
      "ai_suggested": "1.2.0",
      "human_reasoning": "New ship features offset handoff removal",
      "alternatives_considered": ["2.0.0"]
    },
    "tasks": {
      "value": "TASK-009:complete,TASK-010:deferred",
      "ai_suggested": "TASK-009:complete,TASK-010:complete",
      "human_override": true
    }
  },
  "executed_by": "claude",
  "authorized_by": "user@example.com"
}
```

### 3. Focus Maintenance: Prevent Passive Acceptance

**Principle**: Dialogues should require active engagement, not passive confirmation.

**Anti-Patterns**:
```
❌ "I've filled everything out. Confirm? (Y/n)"
   [Invites rubber-stamping]

❌ "Shipping version 1.2.0 with these changes: [wall of text]. OK?"
   [Too much to process, defaults to yes]
```

**Patterns**:
```
✅ "What version should this be?"
   [Requires human to think and choose]

✅ "We have 2 incomplete tasks. How should we handle them?"
   Options:
   - Mark complete (if done)
   - Defer to next sprint (if blocked)
   - Keep in progress (if ongoing)
   [Presents meaningful choices]
```

**Guidelines**:
- Ask open questions for key decisions
- Offer options with clear trade-offs
- Require human to choose, not just confirm
- AI explains WHY it matters

### 4. Flow State Preservation: Judicious Interruption

**Principle**: Use dialogues only at critical junctures. Pre-populate with intelligent defaults from context.

**When to Interrupt**:
- ✅ Strategic decisions (versioning, deployment targets)
- ✅ Irreversible actions (delete data, deploy to production)
- ✅ Ambiguous situations (multiple valid approaches)
- ✅ Policy compliance (task completion, documentation)

**When NOT to Interrupt**:
- ❌ Information available in context
- ❌ Decisions with obvious answers
- ❌ Low-stakes choices
- ❌ Purely mechanical operations

**Smart Pre-population**:
```json
{
  "fields": [
    {
      "id": "version",
      "required": true,
      "default": "1.2.0",  // AI analyzed git diff, commits
      "reasoning": "Major feature removed but new features added",
      "confidence": 0.85,   // High confidence = less dialogue needed
      "human_override": true
    },
    {
      "id": "changelog_entry",
      "default": "feat: Retire ginko handoff command, enhance ship",
      "reasoning": "Extracted from commit message pattern",
      "confidence": 0.95,   // Very high confidence = just confirm
      "human_override": true
    }
  ]
}
```

**Dialogue Optimization**:
```
High confidence (>90%): "I've set version to 1.2.0 based on changes. Override?"
Medium confidence (70-90%): "Should this be 1.2.0 or 2.0.0?"
Low confidence (<70%): "What version should this be? Here's what I see..."
```

## Technical Specification

### Schema Format

```typescript
interface UISchema {
  // What we're trying to accomplish
  intent: string;

  // Fields requiring input
  fields: Field[];

  // Known context for pre-population
  context: Record<string, any>;

  // AI-generated suggestions with reasoning
  suggestions: Record<string, Suggestion>;

  // Validation rules
  constraints: Constraint[];

  // Execution metadata
  metadata: {
    schemaVersion: string;
    commandName: string;
    requiresHumanApproval: boolean;
    criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface Field {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'confirm' | 'number';
  required: boolean;
  default?: any;
  options?: Option[];
  hint?: string;
  reasoning?: string;  // Why this field matters
  confidence?: number; // AI confidence in default (0-1)
  humanOverride?: boolean; // Can AI proceed with default?
}

interface Suggestion {
  value: any;
  reasoning: string;
  confidence: number;
  alternatives?: Array<{value: any, reasoning: string}>;
}

interface Option {
  value: any;
  label: string;
  description?: string;
  consequences?: string; // What happens if chosen
}

interface Constraint {
  field: string;
  rule: 'required' | 'regex' | 'range' | 'dependency';
  params: any;
  message: string; // Error message if violated
}
```

### Example Schema

```json
{
  "intent": "Ship changes with documentation update",
  "fields": [
    {
      "id": "version",
      "label": "Release version",
      "type": "text",
      "required": true,
      "default": "1.2.0",
      "reasoning": "Major feature removed (handoff) but new features added (ship --docs). Suggests minor bump.",
      "confidence": 0.85,
      "humanOverride": true,
      "hint": "Current: 1.1.2. Use semantic versioning: MAJOR.MINOR.PATCH"
    },
    {
      "id": "changelog_entry",
      "label": "Changelog description",
      "type": "text",
      "required": true,
      "default": "feat: Retire ginko handoff command, enhance ship with cleanup and docs",
      "reasoning": "Extracted from commit message following conventional commits format",
      "confidence": 0.95,
      "humanOverride": true
    },
    {
      "id": "tasks",
      "label": "Incomplete sprint tasks disposition",
      "type": "multiselect",
      "required": false,
      "options": [
        {
          "value": "TASK-009:complete",
          "label": "TASK-009: Two-Tier Configuration - Mark complete",
          "consequences": "Task removed from sprint, marked done in backlog"
        },
        {
          "value": "TASK-009:deferred",
          "label": "TASK-009: Two-Tier Configuration - Defer to next sprint",
          "consequences": "Task moves to next sprint plan"
        },
        {
          "value": "TASK-010:complete",
          "label": "TASK-010: Reference System - Mark complete",
          "consequences": "Task removed from sprint, marked done in backlog"
        }
      ],
      "hint": "2 tasks are incomplete in current sprint. Choose disposition for each.",
      "reasoning": "Sprint hygiene requires task disposition before shipping"
    }
  ],
  "context": {
    "currentVersion": "1.1.2",
    "branch": "main",
    "filesChanged": 15,
    "linesAdded": 529,
    "linesRemoved": 2048,
    "incompleteTasks": ["TASK-009", "TASK-010"],
    "commitMessage": "feat: Retire ginko handoff command, enhance ship with cleanup and docs"
  },
  "suggestions": {
    "version": {
      "value": "1.2.0",
      "reasoning": "Feature removal suggests major version, but new features offset. Net effect: minor bump.",
      "confidence": 0.85,
      "alternatives": [
        {
          "value": "2.0.0",
          "reasoning": "If you emphasize breaking change (handoff removal) over new features"
        },
        {
          "value": "1.1.3",
          "reasoning": "If you consider this purely cleanup/refactoring (not recommended)"
        }
      ]
    }
  },
  "constraints": [
    {
      "field": "version",
      "rule": "regex",
      "params": "^\\d+\\.\\d+\\.\\d+$",
      "message": "Version must follow semantic versioning: MAJOR.MINOR.PATCH"
    }
  ],
  "metadata": {
    "schemaVersion": "1.0",
    "commandName": "ginko ship --docs",
    "requiresHumanApproval": true,
    "criticalityLevel": "high"
  }
}
```

### CLI Convention

**Discovery Mode**: `--dry-run` flag returns schema without execution

```bash
ginko ship --docs --dry-run > schema.json
```

**Declarative Execution**: All fields provided as flags

```bash
ginko ship --docs \
  --version=1.2.0 \
  --changelog="feat: Retire ginko handoff command, enhance ship" \
  --tasks="TASK-009:complete,TASK-010:deferred"
```

**Audit Trail**: Logged to session log

```bash
ginko log --show | grep "ship --docs"
```

## Implementation Guidelines

### When to Use Generative UI

**Use when**:
- ✅ Action requires human judgment (versioning, deployment)
- ✅ Multiple valid approaches exist
- ✅ Decision has significant consequences
- ✅ Compliance/policy requires human approval
- ✅ Information not available in context

**Don't use when**:
- ❌ Single obvious answer exists
- ❌ Information available in git/context
- ❌ Purely mechanical operation
- ❌ Low-stakes, reversible action

### Dialogue Design Patterns

**1. Open Questions for Key Decisions**
```
AI: "What version should this be?"
[Not: "Should this be 1.2.0?"]
```

**2. Explain Trade-offs**
```
AI: "We can mark TASK-009 as complete or defer it. Complete means
     it's done and won't appear in next sprint. Defer means it moves
     to the next sprint plan. Which makes sense?"
```

**3. Show AI Reasoning**
```
AI: "I'm suggesting 1.2.0 because we removed handoff (major change)
     but added ship --docs (offsetting feature). If you see this
     primarily as a breaking change, 2.0.0 might be better. Your call."
```

**4. Confirm Understanding**
```
AI: "So to confirm: version 1.2.0, mark TASK-009 complete, defer
     TASK-010. Sound right?"
```

### Field Types & When to Use

| Type | Use When | Example |
|------|----------|---------|
| `text` | Free-form input needed | Version number, commit message |
| `select` | One choice from options | Deployment target, priority level |
| `multiselect` | Multiple choices allowed | Task dispositions, feature flags |
| `confirm` | Yes/no decision | Proceed with deployment? |
| `number` | Numeric value with range | Timeout seconds, retry count |

### Confidence Thresholds

| Confidence | Dialogue Strategy |
|-----------|------------------|
| 95-100% | "I've set X to Y. Override?" (just confirm) |
| 85-95% | "Should X be Y or Z?" (offer top 2 choices) |
| 70-85% | "What should X be? I'm thinking Y because..." (explain reasoning) |
| <70% | "What should X be? Here's what I know..." (full context) |

## Modality Extensions (Future)

The same schema can drive different UI modalities:

### Terminal Chat (Current)
```
AI: "Ready to ship! A few decisions:
     - Version (current: 1.1.2, suggest: 1.2.0)
     - 2 incomplete tasks need disposition
     What version should I use?"
```

### Web UI (Future)
```html
<form>
  <label>Version
    <input value="1.2.0" />
    <hint>Current: 1.1.2. AI suggests 1.2.0 (85% confidence)</hint>
    <reasoning>Feature removal offset by new features</reasoning>
  </label>
  <fieldset>
    <legend>Incomplete Tasks</legend>
    <label><input type="checkbox" value="TASK-009:complete" />
      TASK-009: Mark complete
      <consequence>Removed from sprint</consequence>
    </label>
  </fieldset>
</form>
```

### Voice (Future)
```
AI: "I'm ready to ship. Current version is one point one point two.
     Based on the changes, I suggest one point two point zero.
     We removed handoff but added new ship features. Sound good?"
Human: "Yeah, one point two"
AI: "Got it. Two sprint tasks are incomplete. Should I mark them
     complete or defer them?"
```

### Mobile (Future)
```
[Card interface with swipe gestures]
Version: 1.2.0 [Edit]
  → Swipe for alternatives

Tasks:
  TASK-009 [Swipe → Complete | Defer | Keep]
  TASK-010 [Swipe → Complete | Defer | Keep]

[Ship] button
```

## Consequences

### Positive

1. **Preserves Flow State**: Human never leaves chat/conversation
2. **Maintains Accountability**: Explicit human decisions with audit trail
3. **Prevents Passive Acceptance**: Requires active engagement
4. **Modality Agnostic**: Same schema works for chat, web, voice, mobile
5. **Self-Documenting**: Schema defines what's needed, no separate docs
6. **Context-Aware**: AI uses conversation history to pre-populate
7. **Audit Trail**: Complete record of human decisions
8. **Evolvable**: Change schema, all modalities update instantly

### Negative

1. **Two-step execution**: Dry-run + execute (vs single call)
2. **Schema maintenance**: Tools must maintain schema definitions
3. **Complexity**: More sophisticated than simple prompts
4. **Learning curve**: Developers must understand pattern

### Neutral

1. **AI dependency**: Requires AI to intermediate (by design)
2. **Opinionated**: Enforces specific collaboration model
3. **Schema versioning**: Must handle schema evolution

## Migration Strategy

### Phase 1: Retrofit Existing Commands (Current Sprint)

Start with `ginko ship --docs`:

```bash
# Implement dry-run mode
ginko ship --docs --dry-run → returns schema

# Update ship.ts to accept declarative flags
ginko ship --docs --version=X --changelog=Y --tasks=Z
```

### Phase 2: Extend to Other Commands (Next Sprint)

Apply pattern to:
- `ginko init` - Project initialization
- `ginko config` - Configuration changes
- `ginko deploy` - Deployment workflows

### Phase 3: Web Dashboard (Future)

Build web UI that:
- Accepts schema from any command
- Renders form automatically
- Returns completed values
- Logs audit trail

## Examples

### Example 1: Ship with Docs

**Dry-run**:
```bash
$ ginko ship --docs --dry-run
{
  "intent": "Ship with documentation update",
  "fields": [
    {"id": "version", "label": "Version", "default": "1.2.0", "confidence": 0.85},
    {"id": "changelog", "label": "Changes", "default": "feat: ...", "confidence": 0.95}
  ],
  "context": {"currentVersion": "1.1.2", "filesChanged": 15},
  "suggestions": {"version": {"value": "1.2.0", "reasoning": "..."}}
}
```

**AI Dialogue**:
```
AI: Ready to ship! I need to know:
    - Version: I suggest 1.2.0 because we removed handoff but added
      new ship features. Current is 1.1.2. What do you think?

Human: 1.2.0 works

AI: Great! I've drafted the changelog entry as "feat: Retire ginko
    handoff command, enhance ship with cleanup and docs". Sound good?

Human: Perfect

AI: Shipping now with version 1.2.0...
```

**Execution**:
```bash
ginko ship --docs --version=1.2.0 \
  --changelog="feat: Retire ginko handoff command, enhance ship with cleanup and docs"
```

**Audit Log**:
```json
{
  "timestamp": "2025-10-23T16:04:41Z",
  "command": "ginko ship --docs",
  "human_decisions": {
    "version": "1.2.0",
    "changelog": "feat: Retire ginko handoff command, enhance ship with cleanup and docs"
  },
  "ai_suggestions_accepted": ["version", "changelog"],
  "ai_confidence": 0.90
}
```

### Example 2: Deploy to Production

**Dry-run**:
```bash
$ ginko deploy --dry-run
{
  "intent": "Deploy application to environment",
  "fields": [
    {
      "id": "environment",
      "type": "select",
      "required": true,
      "options": [
        {"value": "staging", "description": "Safe, reversible"},
        {"value": "production", "description": "Live users, irreversible", "consequences": "⚠️ Affects 10k+ users"}
      ]
    },
    {
      "id": "confirmation",
      "type": "confirm",
      "required": true,
      "label": "Confirm deployment to production",
      "show_if": {"environment": "production"}
    }
  ],
  "metadata": {"criticalityLevel": "critical"}
}
```

**AI Dialogue**:
```
AI: Where should I deploy?
    - staging (safe, reversible)
    - production (live users, affects 10k+ users, irreversible)

Human: Production

AI: ⚠️ This will deploy to production, affecting 10,000+ users.
    All tests passed. Confirm deployment?

Human: Yes, deploy to production

AI: Deploying to production now...
```

### Example 3: Initialize Project (Low Confidence)

**Dry-run**:
```bash
$ ginko init --dry-run
{
  "fields": [
    {
      "id": "project_name",
      "confidence": 0.0,
      "reasoning": "Cannot infer from directory name '.'"
    },
    {
      "id": "git_url",
      "confidence": 0.0,
      "reasoning": "No git remote found"
    }
  ]
}
```

**AI Dialogue**:
```
AI: I need some information to set up the project:
    - What's the project name? (couldn't infer from directory)
    - What's the git repository URL? (no remote found)

Human: Project is "acme-dashboard", repo is github.com/acme/dashboard

AI: Got it! Initializing acme-dashboard with repo github.com/acme/dashboard...
```

## Validation & Testing

### Schema Validation

```bash
# Validate schema structure
ginko ship --docs --dry-run --validate

# Test schema rendering
ginko ship --docs --dry-run --render-mode=chat
ginko ship --docs --dry-run --render-mode=web
```

### Human-in-the-Loop Testing

1. **Comprehension Test**: Can human understand choices without AI explanation?
2. **Confidence Test**: Do confidence levels match actual human agreement?
3. **Flow Test**: Does dialogue feel natural, not interrogative?
4. **Audit Test**: Can decisions be traced back from logs?

## References

- ADR-033: Context Pressure Mitigation Strategy
- ADR-036: Session Synthesis Architecture
- Session discussion 2025-10-23: "Generative UI concept"
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

## Broader Implications

This pattern enables:

1. **Human-AI Collaboration at Scale**: Preserves accountability while leveraging AI
2. **Modality-Agnostic Tools**: Same tool works via chat, web, voice, mobile
3. **Self-Service Tools**: Non-technical users interact via natural language
4. **Audit Compliance**: Complete record of human decisions
5. **Dynamic Interfaces**: No UI development needed for new commands
6. **Multi-Agent Systems**: Agents can expose schemas to each other
7. **Progressive Enhancement**: Start with chat, add web/voice later

## Future Work

1. **Schema Registry**: Central repository of all command schemas
2. **Web Dashboard**: Universal form generator from schemas
3. **Voice Interface**: Conversational rendering of schemas
4. **Mobile App**: Touch-optimized schema rendering
5. **Schema Versioning**: Handle schema evolution gracefully
6. **AI Training**: Fine-tune models on schema-dialogue patterns
7. **Multi-Agent**: Agents fill schemas for other agents

---

**Core Innovation**: Generative UI inverts traditional UI development. Instead of building forms for tools, tools expose schemas and AI generates appropriate interfaces on-demand in any modality. This preserves human accountability, maintains flow state, and enables true human-AI collaboration.

**Key Insight**: The schema is not just an API specification - it's a collaboration protocol that ensures humans remain accountable while AI provides intelligence and convenience.