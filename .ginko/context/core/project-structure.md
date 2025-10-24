---
module: project-structure
type: core-knowledge
status: active
updated: 2025-10-23
tags: [monorepo, structure, conventions, quick-reference]
priority: critical
audience: [ai-agent]
estimated-tokens: 800
---

# Ginko Project Structure

## Monorepo Layout

```
ginko/
├── packages/
│   ├── cli/           # Command-line interface (@ginkoai/cli)
│   └── shared/        # Shared utilities (@ginkoai/shared)
├── docs/              # Documentation (PRDs, ADRs, architecture)
├── .ginko/            # Context and session storage
├── backlog/           # Git-native backlog items
└── evals/             # Evaluation framework
```

## CLI Package Structure

```
packages/cli/src/
├── commands/          # CLI commands (ginko start, handoff, etc.)
│   ├── backlog/      # Backlog management commands
│   ├── start/        # Session initialization
│   └── handoff/      # Session handoff
├── core/             # Core patterns and abstractions
│   ├── reflection-pattern.ts    # Universal reflection base
│   └── session-log-manager.ts   # Session logging
├── utils/            # Utility functions
│   ├── helpers.ts               # Common helpers
│   ├── context-loader.ts        # Strategic context loading
│   ├── config-loader.ts         # Configuration loading
│   └── reference-parser.ts      # Reference extraction
├── types/            # TypeScript type definitions
│   └── config.ts               # Configuration types
└── services/         # Service layer
    └── active-context-manager.ts
```

## Naming Conventions

**Files and Directories:**
- Commands: kebab-case (`backlog.ts`, `handoff-reflection.ts`)
- Utils: camelCase (`contextLoader.ts`, `helpers.ts`)
- Types: camelCase matching interface name (`config.ts` → `GinkoConfig`)
- Test files: `*.test.ts` next to source

**Code:**
- Interfaces/Types: PascalCase (`BacklogItem`, `SessionConfig`)
- Functions: camelCase (`getUserEmail`, `loadContext`)
- Constants: UPPER_SNAKE_CASE (`MAX_DEPTH`, `DEFAULT_MODE`)
- Private methods: prefix with underscore (`_internalHelper`)

## Where to Find What

**Adding new functionality:**
- New CLI command → `packages/cli/src/commands/<name>/`
- New utility function → `packages/cli/src/utils/`
- New type definition → `packages/cli/src/types/`
- New core pattern → `packages/cli/src/core/`

**Documentation:**
- Architecture Decision → `docs/adr/ADR-XXX-*.md`
- Product Requirements → `docs/PRD/PRD-XXX-*.md`
- Sprint Plans → `docs/sprints/SPRINT-*.md`
- Architecture docs → `docs/architecture/`

**Context and Sessions:**
- Core context modules → `.ginko/context/core/`
- Pattern modules → `.ginko/context/patterns/`
- Session logs → `.ginko/sessions/<user>/current-session-log.md`
- Archived sessions → `.ginko/sessions/<user>/archive/`

**Backlog:**
- Active items → `backlog/items/<ID>.md`
- Templates → `backlog/templates/`
- Archive → `backlog/archive/`

## Key Configuration Files

- `ginko.json` - Project-level configuration (git-tracked)
- `.ginko/local.json` - User-specific config (gitignored)
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Import Path Patterns

```typescript
// Node built-ins
import fs from 'fs-extra';
import path from 'path';

// External packages
import chalk from 'chalk';
import ora from 'ora';

// Internal packages
import { BacklogBase } from '@ginkoai/shared';

// Local absolute imports
import { getUserEmail } from '../../utils/helpers.js';
import { GinkoConfig } from '../../types/config.js';

// Relative imports (same directory)
import { helper } from './helper.js';
```

**Important**: Always use `.js` extension in imports (TypeScript requirement for ESM).

## Build Output

- Source: `packages/cli/src/`
- Compiled: `packages/cli/dist/`
- Built binary: `packages/cli/bin/ginko`

**Note**: Don't edit files in `dist/` - they're auto-generated.
