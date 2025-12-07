# Checkpoint Core Library

**EPIC-004 Sprint 5 TASK-1**

Git-native work state snapshots for resilient AI-to-AI collaboration.

## Overview

The checkpoint library provides lightweight snapshots of agent work state for resilience and recovery. Checkpoints capture:

- **Git commit hash** - Current code state
- **Modified files** - Changes since task start
- **Event stream position** - Last event ID for context continuity
- **Metadata** - Task-specific state

Checkpoints enable rollback to known-good states when agent work needs recovery.

## Key Design Principles

1. **Lightweight references, not full snapshots** - Store git commit + file list, not file contents
2. **Git-native operations** - Actual rollback uses `git reset/stash`, not stored copies
3. **Event stream integration** - Checkpoints mark positions in the event log
4. **Multiple checkpoints per task** - Capture incremental progress safely

## API Reference

### `createCheckpoint(taskId, agentId?, message?, metadata?)`

Creates a checkpoint capturing current work state.

```typescript
const checkpoint = await createCheckpoint(
  'TASK-1',
  'agent_001',
  'Before refactoring API layer',
  { step: 1, phase: 'implementation' }
);

console.log(checkpoint.id);           // cp_1733612345000_abc123
console.log(checkpoint.gitCommit);    // abc123def456...
console.log(checkpoint.filesModified); // ['src/api/routes.ts', ...]
console.log(checkpoint.eventsSince);  // event_1733612000000_xyz
```

**Parameters:**
- `taskId` (string, required) - Task ID this checkpoint belongs to
- `agentId` (string, optional) - Agent creating checkpoint (auto-detected if not provided)
- `message` (string, optional) - Human-readable description
- `metadata` (object, optional) - Additional task-specific data

**Returns:** `Checkpoint` object

**Auto-detection:**
- If `agentId` not provided, checks `GINKO_AGENT_ID` env var
- Falls back to `.ginko/agent.json` config
- Uses `human_<email>` for human users

---

### `getCheckpoint(checkpointId)`

Retrieves a specific checkpoint by ID.

```typescript
const checkpoint = await getCheckpoint('cp_1733612345000_abc123');

if (checkpoint) {
  console.log(checkpoint.taskId);
  console.log(checkpoint.message);
  console.log(checkpoint.timestamp);
}
```

**Returns:** `Checkpoint | null`

---

### `listCheckpoints(taskId?)`

Lists checkpoints, optionally filtered by task ID.

```typescript
// List all checkpoints for TASK-1
const task1Checkpoints = await listCheckpoints('TASK-1');

// List ALL checkpoints
const allCheckpoints = await listCheckpoints();
```

**Returns:** `Checkpoint[]` - Sorted by timestamp (newest first)

---

### `getLatestCheckpoint(taskId)`

Gets the most recent checkpoint for a task.

```typescript
const latest = await getLatestCheckpoint('TASK-1');

if (latest) {
  console.log(`Latest checkpoint: ${latest.id}`);
  console.log(`Created: ${latest.timestamp}`);
}
```

**Returns:** `Checkpoint | null`

---

### `deleteCheckpoint(checkpointId)`

Deletes a checkpoint.

```typescript
await deleteCheckpoint('cp_1733612345000_abc123');
```

---

### `checkpointExists(checkpointId)`

Checks if a checkpoint exists.

```typescript
if (await checkpointExists('cp_1733612345000_abc123')) {
  console.log('Checkpoint exists');
}
```

**Returns:** `boolean`

---

### `exportCheckpoint(checkpointId)`

Exports checkpoint as JSON string for backup/transfer.

```typescript
const json = await exportCheckpoint('cp_1733612345000_abc123');
console.log(json); // Pretty-printed JSON
```

**Returns:** `string` - JSON representation

---

### `importCheckpoint(checkpointData)`

Imports checkpoint from JSON string.

```typescript
const checkpoint = await importCheckpoint(jsonString);
console.log(`Imported: ${checkpoint.id}`);
```

**Returns:** `Checkpoint`

**Throws:** Error if data is invalid

---

### `getCheckpointsByTask(taskId)`

Gets checkpoints grouped by day for display.

```typescript
const grouped = await getCheckpointsByTask('TASK-1');

for (const [date, checkpoints] of grouped) {
  console.log(`${date}:`);
  for (const cp of checkpoints) {
    console.log(`  - ${cp.message}`);
  }
}
```

**Returns:** `Map<string, Checkpoint[]>` - Key is YYYY-MM-DD date string

---

## Data Types

### `Checkpoint`

```typescript
interface Checkpoint {
  id: string;                  // Format: cp_<timestamp>_<random>
  taskId: string;              // Task this checkpoint belongs to
  agentId: string;             // Agent that created checkpoint
  timestamp: Date;             // When checkpoint was created
  gitCommit: string;           // Current git commit hash
  filesModified: string[];     // Files changed since task start
  eventsSince: string;         // Last event ID in stream
  metadata: Record<string, any>; // Custom data
  message?: string;            // Optional description
}
```

## Storage

Checkpoints are stored as JSON files in `.ginko/checkpoints/`:

```
.ginko/
└── checkpoints/
    ├── cp_1733612345000_abc123.json
    ├── cp_1733612456000_def456.json
    └── cp_1733612567000_ghi789.json
```

Each file contains a single checkpoint object.

## Integration with Rollback

Checkpoints work with the rollback system (TASK-3):

1. **Checkpoint** - Capture current state
2. **Work continues** - Agent makes changes
3. **Problem detected** - Work needs recovery
4. **Rollback** - Use `rollback.ts` to restore checkpoint state

See `rollback.ts` for rollback implementation.

## Integration with Event Stream

Checkpoints capture event stream position via `eventsSince` field:

```typescript
const checkpoint = await createCheckpoint('TASK-1', 'agent_001');
console.log(checkpoint.eventsSince); // event_1733612000000_xyz
```

This enables resuming context loading from checkpoint point:

```typescript
import { loadEventsSince } from './context-loader-events.js';

const checkpoint = await getCheckpoint('cp_1733612345000_abc123');
const events = await loadEventsSince(checkpoint.eventsSince);
```

## Usage Patterns

### Incremental Progress Checkpoints

```typescript
// Before starting risky work
const cp1 = await createCheckpoint(
  'TASK-1',
  agentId,
  'Before API refactor'
);

// ... do some work ...

// After completing safe milestone
const cp2 = await createCheckpoint(
  'TASK-1',
  agentId,
  'After API refactor, before database migration'
);

// ... continue work ...
```

### Recovery from Failure

```typescript
// Load latest checkpoint
const latest = await getLatestCheckpoint('TASK-1');

if (latest) {
  // Rollback to checkpoint (see rollback.ts)
  await rollbackToCheckpoint(latest.id);
}
```

### Checkpoint History

```typescript
// Show checkpoint history for task
const checkpoints = await listCheckpoints('TASK-1');

console.log(`Checkpoint history for TASK-1:`);
for (const cp of checkpoints) {
  console.log(`${cp.timestamp.toISOString()}: ${cp.message}`);
  console.log(`  Commit: ${cp.gitCommit.substring(0, 7)}`);
  console.log(`  Files: ${cp.filesModified.length}`);
}
```

### Metadata for Task State

```typescript
// Store task-specific state in metadata
const checkpoint = await createCheckpoint(
  'TASK-1',
  agentId,
  'Checkpoint during implementation',
  {
    phase: 'implementation',
    testsPass: true,
    buildSuccess: true,
    coverage: 85,
    step: 3,
    totalSteps: 5
  }
);
```

## Error Handling

All functions handle errors gracefully:

```typescript
// getCheckpoint returns null for non-existent checkpoints
const cp = await getCheckpoint('cp_nonexistent');
console.log(cp); // null

// listCheckpoints returns empty array on error
const checkpoints = await listCheckpoints('TASK-1');
console.log(checkpoints); // [] if error

// deleteCheckpoint logs warning for non-existent checkpoint
await deleteCheckpoint('cp_nonexistent'); // Logs warning, doesn't throw
```

## Testing

See `test/unit/checkpoint.test.ts` for comprehensive test suite.

Run tests:
```bash
npm test -- test/unit/checkpoint.test.ts
```

## Demo

See `examples/checkpoint-demo.ts` for usage demo:

```bash
npx ts-node examples/checkpoint-demo.ts
```

## Related Files

- `rollback.ts` - Rollback implementation (TASK-3)
- `event-logger.ts` - Event logging (captures eventsSince)
- `orchestrator-state.ts` - Orchestrator state persistence
- `packages/cli/src/commands/checkpoint/` - CLI commands (TASK-9)
- `dashboard/src/app/api/v1/checkpoint/` - API routes

## ADRs

- ADR-043: Event-Based Context Loading
- ADR-051: Resilience & Recovery Strategy (EPIC-004 Sprint 5)

---

*Last updated: 2025-12-07*
*Epic: EPIC-004 Sprint 5 TASK-1*
