# EPIC-007: Cross-Platform AI Instructions

**Status:** Planned
**Created:** 2025-12-19
**ADR:** ADR-055
**Priority:** Medium
**Estimated Effort:** 2-3 sprints

## Overview

Generate platform-specific instruction files during `ginko init` that make AI assistants aware of ginko's 40+ commands through natural language triggers. Instructions-first approach with minimal skills.

## Problem Statement

AI coding assistants (Claude Code, Codex CLI, Cursor, Copilot) each have their own configuration formats. Currently:
- Ginko has ad-hoc Skills in `.claude/commands/` for Claude Code only
- No support for OpenAI Codex CLI, Continue.dev, or other platforms
- Skills require explicit syntax (`/command`) rather than natural language
- Cross-platform inconsistency when humans switch AI assistants

## Goals

1. **Auto-detect** installed AI platforms during `ginko init`
2. **Generate** platform-specific instruction files (CLAUDE.md, AGENTS.md, etc.)
3. **Enable natural language** triggers ("start" → `ginko start`)
4. **Maintain minimal skills** only for complex multi-step workflows
5. **Support updates** via `ginko instructions update`

## Success Criteria

- [ ] `ginko init` detects Claude Code, Codex CLI, Cursor, Copilot
- [ ] Platform-appropriate instruction files generated automatically
- [ ] AI assistants respond to single-word triggers (start, handoff, log, etc.)
- [ ] Existing CLAUDE.md content preserved during merge
- [ ] `ginko instructions update` regenerates from templates
- [ ] Only `/ship` and `/debug` remain as explicit skills

## Architecture

```
ginko init
  │
  ├─► Detect installed AI platforms
  │
  ├─► Generate platform-specific instruction files:
  │     ├── .claude/CLAUDE.md (merge with existing)
  │     ├── AGENTS.md (Codex CLI)
  │     ├── .cursorrules (already exists)
  │     └── .github/copilot-instructions.md (already exists)
  │
  └─► .ginko/instructions/ (canonical source for customization)
```

## Sprints

### Sprint 1: Foundation

**Focus:** Core infrastructure and Claude Code support

| ID | Task | Description | Estimate |
|----|------|-------------|----------|
| e007_s01_t01 | Type definitions | Create `packages/cli/src/types/skills.ts` | S |
| e007_s01_t02 | Base command reference | Create `templates/base-commands.yaml` with all 40+ commands | M |
| e007_s01_t03 | Instruction generator | Create `InstructionGenerator` class | M |
| e007_s01_t04 | Claude template | Create `claude.md.hbs` template | M |
| e007_s01_t05 | Init integration | Modify `init.ts` to generate instructions | M |
| e007_s01_t06 | Merge logic | Handle existing CLAUDE.md content | M |

### Sprint 2: Multi-Platform Support

**Focus:** Codex CLI and other platforms

| ID | Task | Description | Estimate |
|----|------|-------------|----------|
| e007_s02_t01 | Platform detector | Create platform detection for Claude, Codex, Cursor, Copilot | M |
| e007_s02_t02 | Codex template | Create `codex.md.hbs` (AGENTS.md format) | M |
| e007_s02_t03 | Cursor enhancement | Enhance `.cursorrules` generation with full command reference | S |
| e007_s02_t04 | Copilot enhancement | Enhance `copilot-instructions.md` with triggers | S |
| e007_s02_t05 | Update command | Create `ginko instructions update` | M |
| e007_s02_t06 | Version tracking | Track template versions in `.ginko/instructions/.versions.json` | S |

### Sprint 3: Polish & Migration

**Focus:** Skill deprecation and documentation

| ID | Task | Description | Estimate |
|----|------|-------------|----------|
| e007_s03_t01 | Skill cleanup | Remove redundant skills (keep ship.md, debug.md) | S |
| e007_s03_t02 | Ship skill refinement | Enhance `/ship` with full workflow | S |
| e007_s03_t03 | Debug skill refinement | Enhance `/debug` with diagnostic tree | S |
| e007_s03_t04 | Documentation | Update CLAUDE.md, README with new approach | M |
| e007_s03_t05 | Testing | Integration tests for instruction generation | M |
| e007_s03_t06 | Migration guide | Document migration from skills to instructions | S |

## Technical Details

### Files to Create

```
packages/cli/
├── src/
│   ├── core/instructions/
│   │   ├── instruction-generator.ts
│   │   ├── platform-detector.ts
│   │   └── index.ts
│   ├── commands/instructions/
│   │   └── update.ts
│   └── types/skills.ts
├── templates/
│   └── instructions/
│       ├── claude.md.hbs
│       ├── codex.md.hbs
│       └── base-commands.yaml
```

### Files to Modify

- `packages/cli/src/commands/init.ts` - Add instruction generation
- `packages/cli/src/index.ts` - Register `instructions` command

### Skills to Keep

| Skill | Location | Purpose |
|-------|----------|---------|
| `/ship` | `.claude/commands/ship.md` | Multi-step: tests → commit → PR |
| `/debug` | `.claude/commands/debug.md` | Diagnostic decision tree |

### Skills to Deprecate

- `.claude/commands/start.md` → Covered by instructions
- `.claude/commands/handoff.md` → Covered by instructions
- `.claude/commands/quick.md` → Covered by instructions
- `.claude/commands/vibecheck.md` → Covered by instructions
- `.claude/commands/ginko.md` → Covered by instructions

## Platform Formats

| Platform | Detection | File | Location |
|----------|-----------|------|----------|
| Claude Code | `.claude/` exists | CLAUDE.md | `.claude/` or root |
| Codex CLI | `which codex` | AGENTS.md | Root |
| Cursor | `.cursor/` or `.cursorrules` | .cursorrules | Root |
| Copilot | `.github/` exists | copilot-instructions.md | `.github/` |

## User Experience

```bash
$ ginko init
...
✔ AI instructions generated:
  Claude Code: .claude/CLAUDE.md (merged with existing)
  Codex CLI: AGENTS.md (created)

  AI assistants now understand 40+ ginko commands.
  Just say "start" or "handoff" - no special syntax needed.

$ ginko instructions update
✔ Instructions regenerated for: claude-code, codex-cli
  Updated: 2 files
  Skipped: 1 user-modified file
```

## Dependencies

- ADR-055: Cross-Platform AI Instructions Architecture
- Existing adapters: `packages/cli/src/adapters/` (claude, cursor, copilot)
- Existing platform detection: `packages/cli/src/core/platform/`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Merge corrupts existing CLAUDE.md | Use section markers, preserve unmarked content |
| Codex CLI skills feature is experimental | Graceful degradation, warn user to enable |
| Template changes break existing projects | Version tracking, non-destructive updates |

## References

- [Plan File](/Users/cnorton/.claude/plans/zippy-dancing-thunder.md)
- [ADR-055: Cross-Platform AI Instructions](/docs/adr/ADR-055-cross-platform-ai-instructions.md)
- [Unite.AI: Skills Framework Standard](https://www.unite.ai/claudes-skills-framework-quietly-becomes-an-industry-standard/)
