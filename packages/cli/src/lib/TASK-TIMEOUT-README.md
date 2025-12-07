# Task Timeout Module

## Overview

The task timeout module provides configurable timeout monitoring for multi-agent orchestration tasks (EPIC-004 Sprint 5 TASK-6).

## Features

- **Configurable per-task timeouts**: Each task can have its own max duration
- **Warning threshold**: Alerts at 80% of timeout (configurable)
- **Automatic checkpoint creation**: Creates checkpoint when task times out
- **Escalation events**: Logs blocker events for orchestrator intervention
- **Background monitoring**: Periodic checks via TimeoutMonitor class
- **Persistent storage**: Timeouts stored in `.ginko/timeouts/`

## Usage

### Starting a Timeout

```typescript
import { startTaskTimeout } from './task-timeout.js';

// Start timeout with 30 minutes max duration
const timeout = await startTaskTimeout(
  'TASK-1',           // Task ID
  30 * 60 * 1000,     // Max duration in milliseconds
  'agent-123'         // Agent ID assigned to task
);

// With custom configuration
const timeout = await startTaskTimeout(
  'TASK-2',
  60000,
  'agent-456',
  {
    warningThreshold: 0.5,  // Warn at 50% (default 0.8)
  }
);
```

### Background Monitoring

```typescript
import { TimeoutMonitor } from './task-timeout.js';

// Create and start monitor
const monitor = new TimeoutMonitor({
  checkInterval: 30000  // Check every 30 seconds (default)
});

monitor.start();

// Later, stop monitoring
monitor.stop();
```

### Checking for Timeouts

```typescript
import { checkTimeouts } from './task-timeout.js';

// Manually check all timeouts
const timedOutTasks = await checkTimeouts();

for (const task of timedOutTasks) {
  console.log(`Task ${task.taskId} timed out`);
  console.log(`Checkpoint: ${task.checkpointId}`);
  console.log(`Escalation event: ${task.escalationEventId}`);
}
```

### Clearing Timeouts on Completion

```typescript
import { clearTaskTimeout } from './task-timeout.js';

// When task completes successfully
await clearTaskTimeout('TASK-1');
```

### Querying Timeouts

```typescript
import {
  getTaskTimeout,
  getActiveTimeouts,
  getAllTimeouts
} from './task-timeout.js';

// Get specific timeout
const timeout = await getTaskTimeout('TASK-1');
if (timeout) {
  console.log(`Status: ${timeout.status}`);
  console.log(`Warning at: ${timeout.warningAt}`);
  console.log(`Timeout at: ${timeout.timeoutAt}`);
}

// Get all active timeouts
const active = await getActiveTimeouts();
console.log(`${active.length} tasks currently active`);

// Get all timeouts (including completed/timed out)
const all = await getAllTimeouts();
```

### Cleanup

```typescript
import { cleanupOldTimeouts } from './task-timeout.js';

// Clean up timeouts older than 7 days
const cleanedCount = await cleanupOldTimeouts(7 * 24 * 60 * 60 * 1000);
console.log(`Cleaned up ${cleanedCount} old timeouts`);
```

## Data Structures

### TaskTimeout

```typescript
interface TaskTimeout {
  taskId: string;
  agentId: string;
  maxDuration: number;       // milliseconds
  startedAt: Date;
  warningAt?: Date;          // 80% threshold (configurable)
  timeoutAt: Date;
  status: 'active' | 'warning' | 'timed_out' | 'completed';
  checkpointId?: string;     // Created on timeout
  escalationEventId?: string; // Created on timeout
}
```

### TimeoutConfig

```typescript
interface TimeoutConfig {
  defaultTimeout?: number;    // default 30 minutes
  warningThreshold?: number;  // default 0.8 (80%)
  checkInterval?: number;     // default 30 seconds
}
```

### TimedOutTask

```typescript
interface TimedOutTask {
  taskId: string;
  agentId: string;
  duration: number;          // milliseconds elapsed
  checkpointId: string;      // Created checkpoint ID
  escalationEventId: string; // Created escalation event ID
}
```

## Storage

Timeouts are stored in `.ginko/timeouts/` as JSON files:

```
.ginko/
└── timeouts/
    ├── TASK-1.json
    ├── TASK-2.json
    └── TASK-3.json
```

Each file contains the serialized TaskTimeout object with dates stored as ISO strings.

## Integration

### With Orchestrator

```typescript
import { startTaskTimeout, clearTaskTimeout, checkTimeouts } from './task-timeout.js';

// When assigning task to agent
const timeout = await startTaskTimeout(
  taskId,
  task.max_duration || 30 * 60 * 1000,
  agentId
);

// In orchestration loop
const timedOutTasks = await checkTimeouts();
for (const task of timedOutTasks) {
  // Handle timeout - checkpoint already created
  // Reassign task or escalate
}

// When task completes
await clearTaskTimeout(taskId);
```

### Automatic Actions on Timeout

When a task times out, the module automatically:

1. **Creates checkpoint** via `checkpoint.ts`:
   - Captures git state, modified files, event stream position
   - Includes timeout metadata (reason, durations)

2. **Logs escalation event** via `event-logger.ts`:
   - Category: `blocker`
   - Severity: `high`
   - Contains task ID, agent ID, checkpoint ID
   - Tags: `timeout`, `escalation`, task ID, agent ID

## Timeout Status Flow

```
active → warning → timed_out
   ↓
completed
```

- **active**: Task running, no warnings yet
- **warning**: Reached warning threshold (80% by default)
- **timed_out**: Max duration exceeded, checkpoint + escalation created
- **completed**: Task finished successfully before timeout

## Testing

Unit tests are located in `test/unit/task-timeout.test.ts`.

Run tests:
```bash
npm test task-timeout
```

## Implementation Notes

### ADR-002 Compliance

File includes frontmatter:
```typescript
/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [timeout, orchestrator, checkpoint, escalation, epic-004-sprint5, task-6]
 * @related: [checkpoint.ts, event-logger.ts, orchestrator-state.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, uuid]
 */
```

### Error Handling

- Failed checkpoint creation doesn't prevent escalation event
- Failed escalation event is logged but doesn't throw
- Timeout continues to be marked as timed_out even if actions partially fail
- All errors are logged to console with `[TIMEOUT]` prefix

### Performance

- Background monitor uses `unref()` on timer to avoid blocking process exit
- File I/O is async throughout
- Batch operations iterate efficiently over task files
- No memory caching (timeouts loaded on demand from filesystem)

## Future Enhancements

Potential improvements for future sprints:

1. **Graph integration**: Store timeouts in Neo4j for cross-session visibility
2. **Timeout policies**: Define policies per sprint or epic (not just per task)
3. **Auto-recovery**: Automatically retry timed-out tasks with different agents
4. **Metrics**: Track timeout rates, average task durations
5. **Notifications**: Alert on timeout via webhook or email

## Related Documentation

- [ADR-033: Context Pressure Mitigation](../../docs/adr/ADR-033-context-pressure-mitigation-strategy.md)
- [EPIC-004 Sprint 5](../../docs/sprints/SPRINT-2025-12-07-epic-004-sprint-5.md)
- [Checkpoint Module](./checkpoint.ts)
- [Event Logger](./event-logger.ts)
- [Orchestrator State](./orchestrator-state.ts)
