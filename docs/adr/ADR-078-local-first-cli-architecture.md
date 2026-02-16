# ADR-078: Local-First CLI Architecture

## Status
Accepted

## Date
2026-02-15

## Context

Ginko CLI currently requires `ginko login` before most commands work — including `ginko start` and `ginko handoff`. The `requireAuth()` function in `utils/auth-storage.ts` calls `process.exit(1)` when no authentication token exists, blocking all usage for unauthenticated users.

This is incompatible with the open-source release (EPIC-021) and the following business model:

| Tier | Description |
|------|-------------|
| **Free OSS** | Ginko CLI with local files only, community support |
| **Free Cloud** | Insights, faster startup, graph search, community support |
| **Pro Cloud** | Multiple projects, team members, online support |
| **Enterprise** | Isolated instance, SSO, compliance, live support |

The strategy is to establish Ginko as the default AI collaboration graph through the open-source Core CLI, then move users up with value-added cloud features.

### Current State

An audit of 47 graph-dependent files found:
- **16 files** already degrade gracefully (try/catch, cascade fallbacks)
- **27 files** would crash or block without credentials
- **4 files** are purely cloud-only (team management)

Critically, the internal code for `start-reflection.ts` (2300 lines) already handles graph-unavailable gracefully with `isAuthenticated()` checks and local fallbacks. The problem is concentrated in **4 hard `requireAuth()` gates** at command entry points that prevent reaching this resilient code.

## Decision

### Three-Tier Command Architecture

All CLI commands are classified into one of three tiers:

| Tier | Behavior | Auth Required | Examples |
|------|----------|---------------|----------|
| **LOCAL** | Works with zero credentials | No | `start`, `handoff`, `log`, `charter`, `status`, `init`, sprint/task management |
| **CLOUD-ENHANCED** | Works locally, richer with cloud | No (optional) | Context loading, insights, coaching, auto-push |
| **CLOUD-ONLY** | Shows positive upgrade message | Yes | `push`, `pull`, `diff`, `graph/*`, `team/*`, `knowledge/*`, `agent/*`, `assign` |

### New Utility: `utils/cloud-guard.ts`

A central cloud availability module with three functions:

```typescript
// Non-blocking — replaces requireAuth() in LOCAL tier commands
// Returns cloud status for optional enhancement
async function withOptionalCloud(commandName: string): Promise<CloudStatus>

// Blocking — for CLOUD-ONLY commands
// Shows value-proposition message and exits cleanly
async function requireCloud(commandName: string): Promise<void>

// End-of-session nudge — shown once per session
async function showCloudUpgradeHint(feature: string): Promise<void>
```

### Guard Patterns by Tier

**LOCAL tier** — Remove `requireAuth()`, replace with `withOptionalCloud()`:
```typescript
// Before (blocks local users):
await requireAuth('start');

// After (always proceeds, cloud features are optional):
const cloud = await withOptionalCloud('start');
```

**CLOUD-ENHANCED tier** — Early-exit when cloud unavailable:
```typescript
// auto-push.ts: skip push attempt if no cloud
if (!await isAuthenticated()) return;
```

**CLOUD-ONLY tier** — Add `requireCloud()` at command entry:
```typescript
// Shows upgrade message, exits gracefully
await requireCloud('push');
```

### Messaging Philosophy

Cloud-required messages use positive framing (value proposition, not error):

```
This feature requires Ginko Cloud.

  Ginko Cloud (free tier) adds:
    - Knowledge graph search across your codebase
    - Team collaboration and visibility
    - AI-powered coaching insights

  Get started: ginko login

  Everything you've built locally will sync when you connect.
```

### Key Invariants

1. `requireAuth()` in `auth-storage.ts` is **unchanged** — cloud-only commands continue to use it internally
2. `isAuthenticated()` and `isGraphInitialized()` remain the non-blocking checks for conditional cloud enhancement
3. `GraphAdapter.enabled()` pattern (check before write, env var override) remains the model for cloud-enhanced features
4. Local file writes always succeed first; cloud sync is always async and non-critical (event-logger pattern: "Never block user on network issues")

## Consequences

### Positive
- CLI works out of the box after `npm install -g ginko` with zero configuration
- Existing cloud-connected users experience zero changes — all current behavior preserved
- Clean upgrade path: `ginko login` → `ginko graph init` → `ginko push` enables cloud features
- Minimal code changes: 4 critical gates removed, ~20 one-line guards added, 1 new utility file
- Start-reflection's existing fallback code paths activate naturally once the entry gate is removed

### Negative
- Local-only users won't benefit from graph-accelerated context loading (potentially slower startup)
- Session email slug derived from `git config user.email` instead of authenticated user — may mismatch if user later authenticates with different email
- Staleness detector must be suppressed for local-only users (false "never synced" warnings)

### Risks Mitigated
- `getUserEmail()` already falls back to `git config user.email` — safe without auth
- `auto-push.ts` gets `isAuthenticated()` early-exit to prevent crash on dynamic import
- `staleness-detector.ts` returns early when not authenticated to prevent false alarms
- `context/score.ts` defaults to local-only display when no auth (no graph sync attempt)

## Related

- **ADR-043**: Event-based context loading (local-first dual-write pattern)
- **ADR-077**: Git-integrated push/pull sync
- **EPIC-021**: Open-Source Release
- **BUG-026**: Epic nodes silently not created (MATCH vs MERGE — related pattern of silent cloud failures)
