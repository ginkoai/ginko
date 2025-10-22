---
id: TASK-009
type: task
title: Two-Tier Configuration Foundation
parent:
  - FEATURE-024-configuration-and-reference-system
status: todo
priority: critical
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-22T00:00:00.000Z'
effort: 4 hours
tags: [configuration, cli, setup, initialization]
sprint: SPRINT-2025-10-22-configuration-system
size: M
author: chris@watchhill.ai
---

# Two-Tier Configuration Foundation

## Description

Implement the two-tier configuration system that separates team-shared structure (`ginko.json`) from user-specific paths (`.ginko/local.json`).

**Goal**: Enable instant path resolution across all team members without git conflicts.

## Checklist

- [ ] Define TypeScript interfaces for `GinkoConfig` and `LocalConfig`
- [ ] Implement `loadProjectConfig()` to read `ginko.json`
- [ ] Implement `loadLocalConfig()` to read `.ginko/local.json`
- [ ] Create `resolveProjectPath(relativePath)` helper
- [ ] Add schema validation for both config files
- [ ] Update `ginko init` to generate both config files
- [ ] Add `.ginko/local.json` to `.gitignore`
- [ ] Create migration tool for existing projects (`ginko init --migrate`)
- [ ] Write unit tests for config loading and path resolution
- [ ] Update documentation with config schema

## Technical Implementation

**File Locations**:
- `packages/cli/src/utils/config-loader.ts` (new)
- `packages/cli/src/types/config.ts` (new)
- `packages/cli/src/commands/init.ts` (update)
- `packages/cli/src/utils/helpers.ts` (update)

**Config Schemas**:

```typescript
// ginko.json (team-shared)
interface GinkoConfig {
  project: {
    name: string;
    type: 'monorepo' | 'single' | 'library';
  };
  paths: Record<string, string>;  // All relative
  workMode: {
    default: WorkMode;
    documentationDepth: Record<WorkMode, string[]>;
  };
  contextLoading: {
    progressive: boolean;
    maxDepth: number;
    followReferences: boolean;
    priorityOrder: string[];
  };
}

// .ginko/local.json (user-specific, git-ignored)
interface LocalConfig {
  projectRoot: string;  // Absolute
  userEmail: string;
  userSlug: string;
  workMode?: WorkMode;
  lastSession?: string;
}
```

**Path Resolution**:

```typescript
export async function resolveProjectPath(relativePath: string): Promise<string> {
  const local = await loadLocalConfig();
  const project = await loadProjectConfig();
  return path.join(local.projectRoot, relativePath);
}
```

## Acceptance Criteria

- `ginko init` creates both `ginko.json` and `.ginko/local.json`
- `ginko.json` contains only relative paths
- `.ginko/local.json` is git-ignored
- `resolveProjectPath()` works across macOS, Linux, Windows
- Configuration loads in <10ms
- Schema validation catches malformed configs

## Notes

- This is the foundation for all other tasks in FEATURE-024
- Must maintain backward compatibility (fall back to progressive search if no config)
- Configuration caching recommended for performance
- Related to ADR-037 Phase 1

## Dependencies

- None (foundational task)

## Related

- **PRD**: PRD-009
- **ADR**: ADR-037
- **Parent**: FEATURE-024
