---
sprint_id: EPIC-004-S5
epic_id: EPIC-004
status: complete
created: 2025-12-05
updated: 2025-12-07
adr: ADR-051
depends: EPIC-004-S4
---

# Sprint 5: Resilience & Recovery

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Handle failures gracefully with checkpoint/rollback
**Duration:** 2 weeks
**Type:** Reliability
**Depends:** Sprint 4 (Orchestration Layer)
**Progress:** 100% (16/16 tasks complete)

## Sprint Goal

Build resilience mechanisms: checkpointing, rollback, dead letter queues, timeout detection. This sprint makes AI-to-AI orchestration production-ready.

## Success Criteria

- [x] Agent work can be checkpointed at any point
- [x] Failed agent work can be rolled back to checkpoint
- [x] Stale agents detected and their tasks released
- [x] Failed events captured in dead letter queue for retry
- [x] Human escalation API for unresolvable blockers
- [x] Orchestrator recovers from its own restart
- [x] Notification hooks deliver to Slack/Discord/Teams/webhook
- [x] Human receives alerts for escalations and blockers

## Tasks

### TASK-1: Checkpoint Creation
**Status:** [x]
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
- [x] Checkpoint captures current git state
- [x] Lists modified files since task start
- [x] Stores event stream position
- [x] Multiple checkpoints per task allowed

---

### TASK-2: Checkpoint Listing & Query
**Status:** [x]
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
- [x] Lists checkpoints with metadata
- [x] Ordered by timestamp
- [x] Shows file count and commit

---

### TASK-3: Rollback API
**Status:** [x]
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
- [x] Restores git state to checkpoint
- [x] Preserves current work in stash
- [x] Creates audit event
- [x] Task becomes available again

---

### TASK-4: Dead Letter Queue
**Status:** [x]
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
- [x] Failed events captured with reason
- [x] Retry count tracked
- [x] Max retries configurable (default 3)
- [x] Abandoned after max retries

---

### TASK-5: Stale Agent Detection
**Status:** [x]
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
- [x] Stale detection runs periodically
- [x] Stale agents marked offline
- [x] Tasks released for re-claiming
- [x] Event logged with details

---

### TASK-6: Task Timeout Handling
**Status:** [x]
**Effort:** Small
**Files:** `packages/cli/src/lib/task-timeout.ts`

Handle tasks that exceed expected duration:
- Tasks can specify max_duration
- Orchestrator monitors for timeouts
- Timeout triggers checkpoint + escalation

**Acceptance:**
- [x] Timeout configurable per task
- [x] Warning at 80% of timeout
- [x] Auto-checkpoint at timeout
- [x] Escalation created

---

### TASK-7: Human Escalation API
**Status:** [x]
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
- [x] Escalations visible in dashboard
- [x] Severity-based ordering
- [x] Resolution captured with details
- [x] Resolved escalation unblocks task

---

### TASK-8: Orchestrator Recovery
**Status:** [x]
**Effort:** Medium
**Files:** `packages/cli/src/commands/orchestrate.ts`

Handle orchestrator restart:
- Persist orchestrator state to graph
- On restart, resume from last state
- Re-scan task status and continue

**Acceptance:**
- [x] State persisted every 30 seconds
- [x] Restart resumes without data loss
- [x] In-progress tasks re-evaluated
- [x] No duplicate assignments

---

### TASK-9: CLI Checkpoint Commands
**Status:** [x]
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
- [x] All checkpoint operations via CLI
- [x] Clear confirmation prompts for rollback
- [x] `--force` flag for non-interactive use

---

### TASK-10: Notification Hooks System
**Status:** [x]
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
- [x] Hooks configured via ginko.config.json
- [x] Events trigger matching hooks
- [x] Filters respected (severity, epic, task pattern)
- [x] Failed notifications logged, don't block workflow

---

### TASK-11: Slack Notification Adapter
**Status:** [x]
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
- [x] Webhook POST with formatted message
- [x] Rich formatting (bold, links, emoji)
- [x] Retry on transient failures (429, 5xx)
- [x] Timeout after 5 seconds

---

### TASK-12: Discord Notification Adapter
**Status:** [x]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/discord.ts`

Discord webhook integration with embeds.

**Acceptance:**
- [x] Webhook POST with embed format
- [x] Color-coded by severity
- [x] Retry on transient failures

---

### TASK-13: Teams Notification Adapter
**Status:** [x]
**Effort:** Small
**Files:** `packages/cli/src/lib/notifications/teams.ts`

Microsoft Teams webhook (Adaptive Cards).

**Acceptance:**
- [x] Webhook POST with Adaptive Card
- [x] Action buttons for links
- [x] Retry on transient failures

---

### TASK-14: Generic Webhook Adapter
**Status:** [x]
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
- [x] POST JSON payload to configured URL
- [x] Configurable headers (auth, content-type)
- [x] Retry with exponential backoff

---

### TASK-15: CLI Notifications Commands
**Status:** [x]
**Effort:** Small
**Files:** `packages/cli/src/commands/notifications/test.ts`, `packages/cli/src/commands/notifications/list.ts`

```
ginko notifications list          # Show configured hooks
ginko notifications test slack-1  # Send test message
ginko notifications history       # Recent notification log
```

**Acceptance:**
- [x] List shows all configured hooks
- [x] Test sends sample message to specific hook
- [x] History shows last 20 notifications with status

---

### TASK-16: Integration Tests
**Status:** [x]
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
- [x] All resilience flows tested
- [x] Notification flows tested (mock webhooks)
- [x] Failure scenarios covered
- [x] Coverage > 80% for new code

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

- [x] All tasks completed
- [x] Agent failure results in task recovery
- [x] Checkpoint/rollback works end-to-end
- [x] Orchestrator survives restart
- [x] Escalations flow to humans correctly
- [x] Full integration tests passing
- [x] No regression in existing functionality

---

## Progress

**Started:** 2025-12-07
**Completed:** 16/16 tasks (100%)

## Accomplishments

### 2025-12-07: Sprint 5 Complete

All 16 tasks implemented using parallel agent execution:

**Checkpointing System (TASK-1, 2, 9):**
- `packages/cli/src/lib/checkpoint.ts` - Core checkpoint library
- `dashboard/src/app/api/v1/checkpoint/route.ts` - API endpoints
- `packages/cli/src/commands/checkpoint/` - CLI commands (create, list, show)

**Recovery System (TASK-3, 8):**
- `packages/cli/src/lib/rollback.ts` - Git-based rollback
- Enhanced `orchestrate.ts` with state persistence and recovery

**Failure Handling (TASK-4, 5, 6):**
- `packages/cli/src/lib/dead-letter-queue.ts` - DLQ with retry
- `packages/cli/src/lib/stale-agent-detector.ts` - Stale detection
- `packages/cli/src/lib/task-timeout.ts` - Timeout handling

**Human Escalation (TASK-7):**
- `dashboard/src/app/api/v1/escalation/` - API endpoints
- `packages/cli/src/commands/escalation/` - CLI commands

**Notifications (TASK-10-15):**
- `packages/cli/src/lib/notification-hooks.ts` - Hook system
- `packages/cli/src/lib/notifications/` - Adapters (Slack, Discord, Teams, webhook)
- `packages/cli/src/commands/notifications/` - CLI commands

**Testing (TASK-16):**
- `packages/cli/test/integration/resilience.test.ts` - 20 integration tests, all passing

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
