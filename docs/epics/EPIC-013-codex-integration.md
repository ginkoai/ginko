---
epic_id: EPIC-013
status: proposed
created: 2026-01-08
updated: 2026-01-08
tags: [codex, openai, integration, context-management, rust]
---

# EPIC-013: Ginko + OpenAI Codex Integration

## Vision

Bring Ginko's cognitive scaffolding to OpenAI Codex users, enabling dynamic context management, session continuity, and knowledge graph awareness in the fastest-growing open-source coding agent.

## Problem Statement

OpenAI Codex uses static AGENTS.md files for context (32KB limit, no session awareness, no team context). Ginko solves these problems but currently only works with Claude Code. Integrating with Codex would:

- Expand Ginko's reach to the Codex ecosystem (372+ releases, 308 contributors)
- Validate Ginko's architecture against a Rust-native agent
- Enable multi-model workflows (Codex + Claude Code on same project)

## Strategic Options

### Option A: Rust-Native Integration

**Approach:** Port ginko-core to Rust, deep integration with codex-rs.

| Pros | Cons |
|------|------|
| Best performance (no IPC) | High development effort |
| Seamless UX | Rust expertise required |
| Full feature access | Fork maintenance burden |

**Effort:** 8-12 weeks | **Risk:** High | **Reward:** High

### Option B: MCP Bridge

**Approach:** Expose Ginko as MCP tools, zero fork required.

| Pros | Cons |
|------|------|
| No fork maintenance | IPC overhead |
| Works with vanilla Codex | Limited to MCP tool boundaries |
| Fastest to ship | Less seamless UX |

**Effort:** 2-3 weeks | **Risk:** Low | **Reward:** Medium

### Option C: Hybrid Fork

**Approach:** Minimal fork with Rust bridge to existing Ginko CLI.

| Pros | Cons |
|------|------|
| Balanced effort/reward | Some fork maintenance |
| Can track upstream | Subprocess overhead |
| Incremental path to Option A | Two codebases |

**Effort:** 4-6 weeks | **Risk:** Medium | **Reward:** Medium-High

## Recommendation

**Start with Option B** to prove value with minimal investment. If adoption warrants, evolve to **Option C** then **Option A**.

## Success Criteria

- [ ] Codex users can access Ginko context via integration
- [ ] Session logging works across Codex sessions
- [ ] Knowledge graph queries available during Codex tasks
- [ ] Measurable improvement in task completion quality

## Dependencies

- OpenAI Codex MCP support (exists)
- Ginko MCP server (`packages/mcp-server`)
- Rust toolchain (for Options A/C)

## Open Questions

1. Does OpenAI's Codex roadmap conflict with this integration?
2. What's the Codex user appetite for third-party context tools?
3. Should this be "Ginko for Codex" or a true fork ("Codex-Ginko")?

## References

- [OpenAI Codex CLI](https://developers.openai.com/codex/cli)
- [AGENTS.md Spec](https://developers.openai.com/codex/guides/agents-md/)
- [Codex GitHub](https://github.com/openai/codex)
- ADR-043: Event-Based Context Loading
- ADR-033: Context Pressure Mitigation

---

*Proposed: 2026-01-08 | Decision pending*
