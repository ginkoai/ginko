---
sprint_id: EPIC-004-S5
epic_id: EPIC-004
status: not_started
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
depends: EPIC-004-S4
---

# Sprint 5: Resilience & Recovery

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Handle failures gracefully with checkpoint/rollback
**Duration:** 2 weeks
**Type:** Reliability
**Depends:** Sprint 4 (Orchestration Layer)

## Sprint Goal

Build resilience mechanisms: checkpointing, rollback, dead letter queues, timeout detection. This sprint makes AI-to-AI orchestration production-ready.

## Success Criteria

- [ ] Agent work can be checkpointed at any point
- [ ] Failed agent work can be rolled back to checkpoint
- [ ] Stale agents detected and their tasks released
- [ ] Failed events captured in dead letter queue for retry
- [ ] Human escalation API for unresolvable blockers
- [ ] Orchestrator recovers from its own restart
- [ ] Notification hooks deliver to Slack/Discord/Teams/webhook
- [ ] Human receives alerts for escalations and blockers

## Tasks

### TASK-1: Checkpoint Creation
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/checkpoint.ts`, `dashboard/src/app/api/v1/checkpoint/route.ts`

Create work state snapshots:
```typescript
interface Checkpoint {
  id: string;
  taskId: string;
  agentId: string;
  timestamp: Date;
  gitCommit: string;        // Current commit hash
  filesModified: string[];  // List of modified files
  eventsSince: string;      // Last event ID
  metadata: Record<string, any>;
}
```

- `POST /api/v1/checkpoint` - Create checkpoint
- `ginko checkpoint create --task TASK-1`

**Acceptance:**
- [ ] Checkpoint captures current git state
- [ ] Lists modified files since task start
- [ ] Stores event stream position
- [ ] Multiple checkpoints per task allowed

---

### TASK-2: Checkpoint Listing & Query
**Status:** [ ]
**Effort:** Small
**Files:** `dashboard/src/app/api/v1/checkpoint/route.ts`, `packages/cli/src/commands/checkpoint/list.ts`

Query existing checkpoints:
- `GET /api/v1/checkpoint?taskId=TASK-1` - List checkpoints
- `ginko checkpoint list --task TASK-1`

```
ginko checkpoint list --task TASK-1

Checkpoints for TASK-1:
  cp_001  2025-12-05 10:30  commit:abc123  3 files
  cp_002  2025-12-05 11:45  commit:def456  7 files (latest)
```

**Acceptance:**
- [ ] Lists checkpoints with metadata
- [ ] Ordered by timestamp
- [ ] Shows file count and commit

---

### TASK-3: Rollback API
**Status:** [ ]
**Effort:** Large
**Files:** `dashboard/src/app/api/v1/checkpoint/[id]/rollback/route.ts`, `packages/cli/src/lib/rollback.ts`

Restore to checkpoint state:
- `POST /api/v1/checkpoint/:id/rollback` - Initiate rollback
- `ginko checkpoint rollback cp_001`

Rollback process:
1. Verify checkpoint exists
2. Stash current work (git stash)
3. Reset to checkpoint commit
4. Create rollback event
5. Release task for re-claiming

**Acceptance:**
- [ ] Restores git state to checkpoint
- [ ] Preserves current work in stash
- [ ] Creates audit event
- [ ] Task becomes available again

---

### TASK-4: Dead Letter Queue
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/event-queue.ts`, `dashboard/src/app/api/v1/events/dlq/route.ts`

Capture failed events for retry:
```typescript
interface DeadLetterEntry {
  id: string;
  originalEvent: Event;
  failureReason: string;
  failedAt: Date;
  retryCount: number;
  lastRetryAt?: Date;
  status: 'pending' | 'retrying' | 'resolved' | 'abandoned';
}
```

- Failed sync attempts go to DLQ
- `GET /api/v1/events/dlq` - List failed events
- `POST /api/v1/events/dlq/:id/retry` - Retry failed event

**Acceptance:**
- [ ] Failed events captured with reason
- [ ] Retry count tracked
- [ ] Max retries configurable (default 3)
- [ ] Abandoned after max retries

---

### TASK-5: Stale Agent Detection
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/agent-heartbeat.ts`, `dashboard/src/app/api/v1/agent/stale/route.ts`

Detect and handle stale agents:
- Agent stale if no heartbeat for 5 minutes
- Stale agent's tasks released automatically
- Event logged for audit

```cypher
MATCH (a:Agent)
WHERE a.last_heartbeat < datetime() - duration('PT5M')
  AND a.status <> 'offline'
SET a.status = 'offline'
WITH a
MATCH (a)-[c:CLAIMED_BY]->(t:Task)
DELETE c
SET t.status = 'available'
RETURN a, t
```

**Acceptance:**
- [ ] Stale detection runs periodically
- [ ] Stale agents marked offline
- [ ] Tasks released for re-claiming
- [ ] Event logged with details

---

### TASK-6: Task Timeout Handling
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/task-timeout.ts`

Handle tasks that exceed expected duration:
- Tasks can specify max_duration
- Orchestrator monitors for timeouts
- Timeout triggers checkpoint + escalation

**Acceptance:**
- [ ] Timeout configurable per task
- [ ] Warning at 80% of timeout
- [ ] Auto-checkpoint at timeout
- [ ] Escalation created

---

### TASK-7: Human Escalation API
**Status:** [ ]
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/escalation/route.ts`, `packages/cli/src/commands/escalation.ts`

Create escalations for human review:
```typescript
interface Escalation {
  id: string;
  taskId: string;
  agentId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}
```

- `POST /api/v1/escalation` - Create escalation
- `GET /api/v1/escalation` - List open escalations
- `POST /api/v1/escalation/:id/resolve` - Human resolves

**Acceptance:**
- [ ] Escalations visible in dashboard
- [ ] Severity-based ordering
- [ ] Resolution captured with details
- [ ] Resolved escalation unblocks task

---

### TASK-8: Orchestrator Recovery
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/commands/orchestrate.ts`

Handle orchestrator restart:
- Persist orchestrator state to graph
- On restart, resume from last state
- Re-scan task status and continue

**Acceptance:**
- [ ] State persisted every 30 seconds
- [ ] Restart resumes without data loss
- [ ] In-progress tasks re-evaluated
- [ ] No duplicate assignments

---

### TASK-9: CLI Checkpoint Commands
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/commands/checkpoint/create.ts`, `packages/cli/src/commands/checkpoint/list.ts`, `packages/cli/src/commands/checkpoint/rollback.ts`

Full checkpoint CLI:
```
ginko checkpoint create --task TASK-1 --message "Before refactor"
ginko checkpoint list --task TASK-1
ginko checkpoint rollback cp_001
ginko checkpoint show cp_001
```

**Acceptance:**
- [ ] All checkpoint operations via CLI
- [ ] Clear confirmation prompts for rollback
- [ ] `--force` flag for non-interactive use

---

### TASK-10: Notification Hooks System
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/notification-hooks.ts`, `packages/cli/src/lib/notifications/index.ts`

Implement configurable notification system for human observability:

```typescript
interface NotificationHook {
  id: string;
  events: NotificationEvent[];
  destination: NotificationDestination;
  filter?: NotificationFilter;
}

type NotificationEvent =
  | 'escalation'      // Agent creates escalation
  | 'blocker'         // Blocker event logged
  | 'failure'         // Verification fails, agent crashes
  | 'milestone'       // Sprint % threshold (25/50/75/100)
  | 'completion'      // Epic/sprint complete
  | 'stale_agent'     // Agent goes offline unexpectedly
  | 'human_required'; // Agent explicitly requests human

interface NotificationDestination {
  type: 'slack' | 'discord' | 'teams' | 'webhook' | 'email';
  config: Record<string, string>;
}
```

Configuration via `ginko.config.json`:
```json
{
  "notifications": {
    "hooks": [{
      "id": "slack-escalations",
      "events": ["escalation", "blocker"],
      "destination": {
        "type": "slack",
        "config": { "webhook_url": "https://hooks.slack.com/..." }
      },
      "filter": { "severity": ["high", "critical"] }
    }]
  }
}
```

**Acceptance:**
- [ ] Hooks configured via ginko.config.json
- [ ] Events trigger matching hooks
- [ ] Filters respected (severity, epic, task pattern)
- [ ] Failed notifications logged, don't block workflow

---

### TASK-11: Slack Notification Adapter
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/slack.ts`

Slack webhook integration:

```
🚨 *Escalation: EPIC-004 / TASK-3*
Agent `claude-implementer-1` needs help

*Reason:* API rate limit blocking external service calls
*Severity:* High
*Blocked tasks:* TASK-4, TASK-5

<View in Ginko|url> | <View Task|url>
```

**Acceptance:**
- [ ] Webhook POST with formatted message
- [ ] Rich formatting (bold, links, emoji)
- [ ] Retry on transient failures (429, 5xx)
- [ ] Timeout after 5 seconds

---

### TASK-12: Discord Notification Adapter
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/discord.ts`

Discord webhook integration with embeds.

**Acceptance:**
- [ ] Webhook POST with embed format
- [ ] Color-coded by severity
- [ ] Retry on transient failures

---

### TASK-13: Teams Notification Adapter
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/teams.ts`

Microsoft Teams webhook (Adaptive Cards).

**Acceptance:**
- [ ] Webhook POST with Adaptive Card
- [ ] Action buttons for links
- [ ] Retry on transient failures

---

### TASK-14: Generic Webhook Adapter
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/webhook.ts`

Generic webhook for custom integrations:
```json
{
  "event": "escalation",
  "severity": "high",
  "taskId": "TASK-3",
  "agentId": "agent_xxx",
  "reason": "...",
  "timestamp": "2025-12-05T..."
}
```

**Acceptance:**
- [ ] POST JSON payload to configured URL
- [ ] Configurable headers (auth, content-type)
- [ ] Retry with exponential backoff

---

### TASK-15: CLI Notifications Commands
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/commands/notifications/test.ts`, `packages/cli/src/commands/notifications/list.ts`

```
ginko notifications list          # Show configured hooks
ginko notifications test slack-1  # Send test message
ginko notifications history       # Recent notification log
```

**Acceptance:**
- [ ] List shows all configured hooks
- [ ] Test sends sample message to specific hook
- [ ] History shows last 20 notifications with status

---

### TASK-16: Integration Tests
**Status:** [ ]
**Effort:** Large
**Files:** `packages/cli/test/integration/resilience.test.ts`

Test scenarios:
- Checkpoint create/list/rollback flow
- Dead letter queue capture and retry
- Stale agent detection and task release
- Orchestrator restart recovery
- Escalation flow end-to-end
- Notification hooks trigger correctly
- Notification adapters format correctly

**Acceptance:**
- [ ] All resilience flows tested
- [ ] Notification flows tested (mock webhooks)
- [ ] Failure scenarios covered
- [ ] Coverage > 80% for new code

---

## Technical Notes

### Checkpoint Storage Strategy

Checkpoints are lightweight references, not full snapshots:
- Git commit hash (code state)
- Event stream position (context state)
- File list (for quick diff)
- Metadata (task-specific state)

Actual rollback uses git operations, not stored copies.

### Dead Letter Queue Retry Strategy

| Retry | Delay |
|-------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4+ | Abandoned |

### Stale Detection Schedule

- Check every 60 seconds
- Grace period: 5 minutes (configurable)
- Event logged on state change

### Orchestrator State

```typescript
interface OrchestratorState {
  epicId: string;
  startedAt: Date;
  lastCheckpoint: Date;
  activeAssignments: Map<string, string>; // taskId -> agentId
  completedTasks: string[];
  blockedTasks: string[];
  escalations: string[];
}
```

## Files Summary

**New files:**
- `packages/cli/src/lib/checkpoint.ts`
- `packages/cli/src/lib/rollback.ts`
- `packages/cli/src/lib/task-timeout.ts`
- `packages/cli/src/lib/notification-hooks.ts`
- `packages/cli/src/lib/notifications/index.ts`
- `packages/cli/src/lib/notifications/slack.ts`
- `packages/cli/src/lib/notifications/discord.ts`
- `packages/cli/src/lib/notifications/teams.ts`
- `packages/cli/src/lib/notifications/webhook.ts`
- `packages/cli/src/commands/checkpoint/create.ts`
- `packages/cli/src/commands/checkpoint/list.ts`
- `packages/cli/src/commands/checkpoint/rollback.ts`
- `packages/cli/src/commands/checkpoint/show.ts`
- `packages/cli/src/commands/escalation.ts`
- `packages/cli/src/commands/notifications/test.ts`
- `packages/cli/src/commands/notifications/list.ts`
- `packages/cli/src/commands/notifications/history.ts`
- `dashboard/src/app/api/v1/checkpoint/route.ts`
- `dashboard/src/app/api/v1/checkpoint/[id]/rollback/route.ts`
- `dashboard/src/app/api/v1/events/dlq/route.ts`
- `dashboard/src/app/api/v1/agent/stale/route.ts`
- `dashboard/src/app/api/v1/escalation/route.ts`
- `packages/cli/test/integration/resilience.test.ts`

**Modified files:**
- `packages/cli/src/lib/event-queue.ts` (DLQ integration)
- `packages/cli/src/lib/agent-heartbeat.ts` (stale detection)
- `packages/cli/src/commands/orchestrate.ts` (recovery, state persistence)
- `packages/cli/src/index.ts` (add commands)
- `ginko.config.json` schema (notifications section)

## Definition of Done

- [ ] All tasks completed
- [ ] Agent failure results in task recovery
- [ ] Checkpoint/rollback works end-to-end
- [ ] Orchestrator survives restart
- [ ] Escalations flow to humans correctly
- [ ] Full integration tests passing
- [ ] No regression in existing functionality

---

## Progress

**Started:** Not started
**Completed:** 0/16 tasks

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
