---
module: code-conventions
type: core-knowledge
status: active
updated: 2025-10-23
tags: [typescript, conventions, style-guide, best-practices]
priority: high
audience: [ai-agent, developer]
estimated-tokens: 700
---

# Code Conventions

## TypeScript Patterns

**Prefer interfaces over types for objects:**
```typescript
// Good
interface BacklogItem {
  id: string;
  title: string;
  status: ItemStatus;
}

// Avoid (use interface instead)
type BacklogItem = {
  id: string;
  title: string;
}
```

**Explicit return types on exported functions:**
```typescript
// Good
export async function loadConfig(): Promise<GinkoConfig> {
  // ...
}

// Avoid (implicit return type)
export async function loadConfig() {
  // ...
}
```

**Avoid `any`, use `unknown` or proper types:**
```typescript
// Good
function processData(data: unknown): ProcessedData {
  if (typeof data === 'object' && data !== null) {
    // ...
  }
}

// Avoid
function processData(data: any) {
  // Loses type safety
}
```

## Import Organization

**Order imports in 4 groups:**
```typescript
// 1. Node built-ins
import fs from 'fs-extra';
import path from 'path';

// 2. External packages
import chalk from 'chalk';
import ora from 'ora';

// 3. Internal packages
import { BacklogBase } from '../commands/backlog/base.js';

// 4. Local imports
import { getUserEmail } from './helpers.js';
import type { GinkoConfig } from '../types/config.js';
```

**Always use `.js` extension:**
```typescript
// Good
import { helper } from './helpers.js';

// Bad (won't work with ESM)
import { helper } from './helpers';
```

## Error Handling

**Use try-catch for async operations:**
```typescript
async function loadDocument(path: string): Promise<Document | null> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return parseDocument(content);
  } catch (error) {
    console.error(chalk.red(`Failed to load ${path}:`), error);
    return null;
  }
}
```

**Return null for "not found" cases:**
```typescript
async function findItem(id: string): Promise<Item | null> {
  const path = getItemPath(id);
  if (!(await fs.pathExists(path))) {
    return null; // Not found is expected
  }
  return loadItem(path);
}
```

**Throw errors for exceptional conditions:**
```typescript
function validateConfig(config: unknown): GinkoConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration: must be object');
  }
  // ...
}
```

## File Frontmatter (REQUIRED)

**All `.ts` files must include frontmatter:**
```typescript
/**
 * @fileType: command|utility|model|config|service
 * @status: current|deprecated
 * @updated: YYYY-MM-DD
 * @tags: [relevant, keywords, for, search]
 * @related: [connected-file.ts, related-component.tsx]
 * @priority: critical|high|medium|low
 * @complexity: low|medium|high
 * @dependencies: [external-packages, local-modules]
 */
```

**Benefits:**
- AI-optimized file discovery (`head -12 filename.ts`)
- Instant context without reading full file
- Smart search by tags and functionality
- Complexity assessment before diving in

## Naming Conventions

**Variables and functions:**
```typescript
// camelCase for regular variables/functions
const sessionDir = getSessionDirectory();
function calculateMetrics() { }

// PascalCase for classes/interfaces
class BacklogBase { }
interface SessionConfig { }

// UPPER_SNAKE_CASE for constants
const MAX_DEPTH = 3;
const DEFAULT_WORK_MODE = 'think-build';
```

**Private methods (prefix underscore):**
```typescript
class ContextLoader {
  public async load() { }

  private _validateConfig() { }
  private _calculateTokens() { }
}
```

## Async/Await Best Practices

**Prefer async/await over promises:**
```typescript
// Good
async function processItems() {
  const items = await loadItems();
  return items.map(item => transform(item));
}

// Avoid (unless chaining is cleaner)
function processItems() {
  return loadItems().then(items => items.map(transform));
}
```

**Handle Promise.all for parallel operations:**
```typescript
// Good (parallel)
const [config, session, backlog] = await Promise.all([
  loadConfig(),
  loadSession(),
  loadBacklog()
]);

// Avoid (sequential when parallel is possible)
const config = await loadConfig();
const session = await loadSession();
const backlog = await loadBacklog();
```

## Code Comments

**Use JSDoc for public APIs:**
```typescript
/**
 * Load context strategically with priority ordering
 *
 * @param options - Loading options
 * @returns StrategyContext with loaded documents and metrics
 */
export async function loadContextStrategic(
  options: LoadingOptions = {}
): Promise<StrategyContext> {
  // ...
}
```

**Inline comments for complex logic:**
```typescript
// Skip completed tasks - they're not relevant to current work
if (item && item.status === 'done') {
  continue;
}
```

**Avoid obvious comments:**
```typescript
// Bad
const config = await loadConfig(); // Load config

// Good (only when adding context)
// Fall back to default config if project config missing
const config = await loadConfig() ?? getDefaultConfig();
```
