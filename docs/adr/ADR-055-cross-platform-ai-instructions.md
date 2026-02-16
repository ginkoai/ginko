# ADR-055: Cross-Platform AI Instructions Architecture

**Status:** Accepted
**Date:** 2025-12-19
**Decision Makers:** Chris Norton, Claude
**Tags:** ai-integration, platform-compatibility, developer-experience

## Context

Ginko is designed for AI-assisted development where AI partners act on behalf of human collaborators. The industry is converging on a "Skills" architecture for AI coding assistants:

- **Anthropic Claude Code**: `.claude/commands/*.md` with `/command` invocation
- **OpenAI Codex CLI**: `~/.codex/skills/SKILL.md` with `$command` invocation
- **Cursor**: `.cursorrules` for context
- **GitHub Copilot**: `.github/copilot-instructions.md`

We need to decide how ginko should integrate with these platforms to make AI assistants aware of ginko's 40+ commands.

### The Core Insight

Ginko is used BY AI on behalf of humans. Humans rarely invoke ginko directly - they use natural language:
- Human says: "start" → AI runs: `ginko start`
- Human says: "handoff" → AI runs: `ginko handoff`

Skills (`/command`, `$command`) add friction:
- Extra character to type
- Syntax varies by platform
- Creates cross-model confusion when humans switch between AI assistants

## Decision

**Instructions-first, minimal skills.**

Generate platform-specific instruction files during `ginko init` that make AI assistants aware of ginko capabilities through natural language triggers, not skill invocation syntax.

### Architecture

```
ginko init
  │
  ├─► Detect installed AI platforms
  │
  ├─► Generate platform-specific instruction files:
  │     ├── .claude/CLAUDE.md (or merge into existing)
  │     ├── AGENTS.md (Codex CLI standard)
  │     ├── .cursorrules (Cursor - already exists)
  │     └── .github/copilot-instructions.md (already exists)
  │
  └─► Copy canonical instructions to .ginko/instructions/
        (source of truth for customization)
```

### Minimal Skills

Keep only 2-3 skills for complex multi-step workflows where structured prompts add real value:

| Skill | Purpose |
|-------|---------|
| `/ship` | Pre-flight checks → commit → PR creation |
| `/debug` | Diagnostic decision tree with branching logic |

### Instruction Content

All instruction files will contain:

1. **Single-word command triggers** - "start" → `ginko start`
2. **Full command reference** - 40+ commands with descriptions
3. **Workflow guidance** - When to use what
4. **Context loading** - Where to find session state

## Alternatives Considered

### Alternative 1: Full Skills Coverage (35+ skills)

Create skill files for every ginko command.

**Rejected because:**
- High maintenance burden (35+ files per platform)
- Cross-platform syntax inconsistency (`/` vs `$`)
- Adds friction for natural language interaction
- Skills require explicit invocation; instructions are always loaded

### Alternative 2: Skills Only (No instruction files)

Rely entirely on Skills for AI awareness.

**Rejected because:**
- Skills require explicit invocation syntax
- Not all platforms support skills equally
- Humans must learn platform-specific syntax
- Doesn't support natural language triggers

### Alternative 3: No Platform Integration

Let users manually configure AI assistants.

**Rejected because:**
- Poor developer experience
- Inconsistent AI awareness across projects
- Misses opportunity for automatic capability discovery

## Consequences

### Positive

- **Natural language first**: Humans say "start", not "/start" or "$start"
- **Cross-platform consistency**: Same triggers work regardless of AI assistant
- **Low maintenance**: 2-3 templates vs 35+ skill files
- **Always loaded**: Instructions are in AI context from conversation start
- **Graceful degradation**: Works even if skill system unavailable

### Negative

- **Less discoverable**: No `/help` to list available commands (mitigated by full reference in instructions)
- **Platform-specific templates**: Need to maintain template per platform
- **Merge complexity**: Must handle existing CLAUDE.md content gracefully

### Neutral

- Existing skills continue to work (no breaking changes)
- Adapts to industry standard as it evolves

## Implementation

See EPIC-007 for implementation details.

### Key Components

1. **InstructionGenerator** - Generate platform-specific instruction files
2. **Platform detection** - Identify Claude Code, Codex CLI, Cursor, Copilot
3. **Template system** - Handlebars templates for each platform
4. **Merge logic** - Preserve user customizations in existing files
5. **Update command** - `ginko instructions update`

### Files to Create

```
packages/cli/
├── src/core/instructions/
│   ├── instruction-generator.ts
│   ├── platform-detector.ts
│   └── templates/
│       ├── claude.md.hbs
│       ├── codex.md.hbs
│       └── base-commands.yaml
```

## References

- [Claude's Skills Framework Becomes Industry Standard - Unite.AI](https://www.unite.ai/claudes-skills-framework-quietly-becomes-an-industry-standard/)
- [OpenAI Codex CLI Skills PR](https://github.com/openai/codex/pull/7412)
- ADR-002: AI-Optimized File Discovery
- Plan: `~/.claude/plans/your-plan-file.md`
