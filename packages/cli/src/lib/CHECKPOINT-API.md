# Checkpoint API Quick Reference

**File:** `packages/cli/src/lib/checkpoint.ts`
**Epic:** EPIC-004 Sprint 5 TASK-1

## Exports

### Type: `Checkpoint`

```typescript
interface Checkpoint {
  id: string;                  // cp_<timestamp>_<random>
  taskId: string;
  agentId: string;
  timestamp: Date;
  gitCommit: string;           // Current commit hash
  filesModified: string[];     // Modified files list
  eventsSince: string;         // Last event ID
  metadata: Record<string, any>;
  message?: string;
}
```

## Functions

### Required Functions (Sprint Spec)

| Function | Signature | Description |
|----------|-----------|-------------|
| `createCheckpoint` | `(taskId, agentId?, message?, metadata?) => Promise<Checkpoint>` | Create checkpoint with current state |
| `listCheckpoints` | `(taskId?) => Promise<Checkpoint[]>` | List checkpoints, optionally filtered |
| `getCheckpoint` | `(checkpointId) => Promise<Checkpoint \| null>` | Get single checkpoint by ID |

### Utility Functions (Bonus)

| Function | Signature | Description |
|----------|-----------|-------------|
| `deleteCheckpoint` | `(checkpointId) => Promise<void>` | Delete checkpoint |
| `checkpointExists` | `(checkpointId) => Promise<boolean>` | Check if exists |
| `getLatestCheckpoint` | `(taskId) => Promise<Checkpoint \| null>` | Get most recent for task |
| `exportCheckpoint` | `(checkpointId) => Promise<string>` | Export as JSON |
| `importCheckpoint` | `(data) => Promise<Checkpoint>` | Import from JSON |
| `getCheckpointsByTask` | `(taskId) => Promise<Map<string, Checkpoint[]>>` | Grouped by day |

## Usage

```typescript
import {
  createCheckpoint,
  getCheckpoint,
  listCheckpoints,
  getLatestCheckpoint
} from './lib/checkpoint.js';

// Create checkpoint
const cp = await createCheckpoint('TASK-1', 'agent_001', 'Before refactor');
console.log(cp.id);           // cp_1733612345000_abc123
console.log(cp.gitCommit);    // abc123def456...
console.log(cp.filesModified); // ['src/api/routes.ts', ...]

// Get checkpoint
const retrieved = await getCheckpoint(cp.id);

// List for task
const checkpoints = await listCheckpoints('TASK-1');

// Get latest
const latest = await getLatestCheckpoint('TASK-1');
```

## Storage

Location: `.ginko/checkpoints/`

Format: One JSON file per checkpoint
- Filename: `<checkpoint-id>.json`
- Example: `cp_1733612345000_abc123.json`

## Integration

### With Rollback (TASK-3)
```typescript
const cp = await getLatestCheckpoint('TASK-1');
await rollbackToCheckpoint(cp.id);
```

### With Event Stream
```typescript
const cp = await getCheckpoint('cp_xxx');
const events = await loadEventsSince(cp.eventsSince);
```

### With Orchestrator
```typescript
await createCheckpoint(taskId, orchestratorId, 'State checkpoint', {
  activeAssignments: [...],
  completedTasks: [...],
  blockedTasks: [...]
});
```

## See Also

- Full docs: `checkpoint.README.md`
- Demo: `examples/checkpoint-demo.ts`
- Tests: `test/unit/checkpoint.test.ts`

---

*EPIC-004 Sprint 5 TASK-1*
