# Multi-Agent Orchestration Guide

Ginko enables multiple AI agents to collaborate on complex development projects with minimal human intervention. This guide covers setup, patterns, and operations.

## Quick Start (5 Minutes)

### 1. Authenticate
```bash
ginko login
```

### 2. Register an Agent
```bash
ginko agent register --name "Worker-1" --capabilities "typescript,testing"
```

### 3. Start Working
```bash
# As a worker agent (polls for tasks)
ginko agent work

# Or as an orchestrator (assigns tasks)
ginko orchestrate
```

---

## Core Concepts

### Agents
AI instances that can claim and complete tasks. Each agent has:
- **Name**: Unique identifier (e.g., "Backend-Agent-1")
- **Capabilities**: Skills for task matching (e.g., "typescript", "testing", "api")
- **Status**: active, idle, or stale
- **Heartbeat**: Periodic signal to indicate liveness

### Tasks
Units of work defined in sprint files. Tasks have:
- **Status**: `[ ]` todo, `[@]` in progress, `[x]` complete
- **Dependencies**: Other tasks that must complete first
- **Acceptance Criteria**: Verifiable completion conditions
- **Claim**: Atomic assignment to one agent

### Events
All agent activity streams through the event system:
- Task claims, completions, blockers
- Checkpoints and rollbacks
- Escalations and resolutions

### Orchestrator
A supervisor agent that:
- Decomposes epics into tasks
- Computes execution order (topological sort)
- Assigns tasks to workers by capability
- Monitors progress and handles failures

---

## Orchestration Patterns

### Pattern A: Supervisor + Workers

One orchestrator coordinates multiple worker agents.

```
┌─────────────────────────────────────┐
│         Orchestrator Agent          │
│    (ginko orchestrate --epic X)     │
└─────────────────┬───────────────────┘
                  │ assigns tasks
      ┌───────────┼───────────┐
      ▼           ▼           ▼
  ┌───────┐   ┌───────┐   ┌───────┐
  │Worker │   │Worker │   │Worker │
  │Agent 1│   │Agent 2│   │Agent 3│
  └───────┘   └───────┘   └───────┘
```

**Setup:**
```bash
# Terminal 1: Start orchestrator
ginko orchestrate --verbose

# Terminal 2-4: Start workers
ginko agent register --name "Worker-1" --capabilities typescript
ginko agent work
```

### Pattern B: Peer Swarm

Equal agents compete for available tasks (no central coordinator).

```
┌─────────┐   ┌─────────┐   ┌─────────┐
│ Agent 1 │   │ Agent 2 │   │ Agent 3 │
└────┬────┘   └────┬────┘   └────┬────┘
     │             │             │
     └─────────────┼─────────────┘
                   ▼
           ┌─────────────┐
           │  Task Pool  │
           │ (first-come │
           │  first-win) │
           └─────────────┘
```

**Setup:**
```bash
# Each agent polls independently
ginko agent register --name "Peer-1" --capabilities typescript
ginko agent work  # Automatically claims available tasks
```

### Pattern C: Pipeline Stages

Specialized agents for each development phase.

```
Planner → Implementer → Reviewer → Deployer
```

**Setup:**
```bash
# Register specialized agents
ginko agent register --name "Planner" --capabilities planning,architecture
ginko agent register --name "Implementer" --capabilities typescript,coding
ginko agent register --name "Reviewer" --capabilities review,testing
ginko agent register --name "Deployer" --capabilities deployment,ci-cd
```

---

## CLI Reference

### Agent Management

```bash
# Register a new agent
ginko agent register --name "My-Agent" --capabilities "typescript,testing,api"

# List all agents
ginko agent list
ginko agent list --status active
ginko agent list --capability typescript

# Show current agent status
ginko agent status

# Start worker mode (polls for and executes tasks)
ginko agent work
ginko agent work --poll-interval 10  # Check every 10 seconds
```

### Orchestration

```bash
# Start orchestrator for current sprint
ginko orchestrate

# Preview without executing
ginko orchestrate --dry-run

# Orchestrate specific epic
ginko orchestrate --epic EPIC-005

# Resume from checkpoint after restart
ginko orchestrate --resume

# Extended runtime
ginko orchestrate --max-runtime 120  # 2 hours

# Verbose output
ginko orchestrate --verbose
```

**Exit Codes:**
- `0` - All tasks completed successfully
- `1` - Error or stalled (no progress)
- `75` - Checkpoint saved, respawn needed (use `--resume`)

### Task Verification

```bash
# Verify task acceptance criteria
ginko verify TASK-1
ginko verify TASK-1 --json  # JSON output for automation
```

Acceptance criteria are defined in sprint files:
```markdown
### TASK-1: Implement authentication
**Status:** [@]
**Acceptance:**
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] Response time < 200ms
```

### Checkpoints & Recovery

```bash
# Create checkpoint before risky changes
ginko checkpoint create --task TASK-1 --message "Before refactor"

# List checkpoints
ginko checkpoint list
ginko checkpoint list --task TASK-1

# Show checkpoint details
ginko checkpoint show cp_1701234567_a1b2c3d4
```

Checkpoints capture:
- Git commit hash
- Modified files list
- Event stream position
- Custom message

### Escalations

When an agent is blocked and needs human help:

```bash
# Create escalation
ginko escalation create \
  --task TASK-5 \
  --reason "Ambiguous requirements in auth spec" \
  --severity high

# List open escalations
ginko escalation list --status open
ginko escalation list --severity critical

# Resolve (as human)
ginko escalation resolve escalation_123 \
  --resolution "Clarified in meeting - use JWT"
```

**Severity Levels:**
- `critical` - Blocks multiple agents, needs immediate attention
- `high` - Blocks one agent, needs attention within hours
- `medium` - Can work around, needs attention within a day
- `low` - Nice to have clarity, not blocking

### Dead Letter Queue (Failed Events)

Events that fail to process are captured for retry:

```bash
# List failed events
ginko dlq list
ginko dlq list --status pending

# Show details
ginko dlq show dlq_entry_123

# Retry specific entry
ginko dlq retry dlq_entry_123

# Retry all eligible
ginko dlq retry-all

# Statistics
ginko dlq stats

# Cleanup old entries
ginko dlq cleanup --days 30
```

### Notifications

Configure alerts for human observability:

```bash
# List configured hooks
ginko notifications list

# Test a hook
ginko notifications test slack-escalations

# View delivery history
ginko notifications history
ginko notifications history --limit 50
```

---

## Configuration

### ginko.config.json

```json
{
  "notifications": {
    "hooks": [
      {
        "id": "slack-escalations",
        "type": "slack",
        "webhook_url": "https://hooks.slack.com/services/...",
        "events": ["escalation.created", "escalation.critical"]
      },
      {
        "id": "discord-progress",
        "type": "discord",
        "webhook_url": "https://discord.com/api/webhooks/...",
        "events": ["task.completed", "sprint.completed"]
      },
      {
        "id": "teams-alerts",
        "type": "teams",
        "webhook_url": "https://outlook.office.com/webhook/...",
        "events": ["agent.stale", "dlq.threshold"]
      },
      {
        "id": "custom-webhook",
        "type": "webhook",
        "webhook_url": "https://api.example.com/ginko-events",
        "events": ["*"]
      }
    ]
  },
  "orchestration": {
    "pollInterval": 5,
    "maxRuntime": 60,
    "staleAgentThreshold": 300
  }
}
```

### Notification Event Types

| Event | Description |
|-------|-------------|
| `escalation.created` | New escalation requires human attention |
| `escalation.critical` | Critical severity escalation |
| `task.completed` | Agent completed a task |
| `task.blocked` | Agent blocked on a task |
| `sprint.completed` | All sprint tasks done |
| `agent.stale` | Agent missed heartbeats |
| `dlq.threshold` | DLQ exceeded threshold |
| `checkpoint.created` | Work state checkpointed |
| `*` | All events |

---

## API Reference

All APIs require authentication via Bearer token.

### Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agent` | Register new agent |
| GET | `/api/v1/agent` | List agents |
| GET | `/api/v1/agent/:id` | Get agent details |
| PATCH | `/api/v1/agent/:id` | Update agent (heartbeat) |
| DELETE | `/api/v1/agent/:id` | Deregister agent |
| GET | `/api/v1/agent/stale` | List stale agents |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/task/:id/claim` | Claim task (atomic) |
| POST | `/api/v1/task/:id/release` | Release claimed task |
| POST | `/api/v1/task/:id/complete` | Mark task complete |
| POST | `/api/v1/task/:id/block` | Signal blocker |
| POST | `/api/v1/task/:id/verify` | Verify acceptance criteria |
| GET | `/api/v1/task/:id/gotchas` | Get task gotchas |
| GET | `/api/v1/task/:id/patterns` | Get task patterns |

### Checkpoint Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/checkpoint` | Create checkpoint |
| GET | `/api/v1/checkpoint` | List checkpoints |
| GET | `/api/v1/checkpoint/:id` | Get checkpoint details |

### Escalation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/escalation` | Create escalation |
| GET | `/api/v1/escalation` | List escalations |
| GET | `/api/v1/escalation/:id` | Get escalation details |
| PATCH | `/api/v1/escalation/:id` | Resolve escalation |

### DLQ Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/events/dlq` | List DLQ entries |
| GET | `/api/v1/events/dlq/:id` | Get DLQ entry details |
| POST | `/api/v1/events/dlq/:id/retry` | Retry DLQ entry |

---

## Troubleshooting

### Agent Not Receiving Tasks

1. **Check registration:**
   ```bash
   ginko agent status
   ```

2. **Verify capabilities match:**
   ```bash
   ginko agent list --capability typescript
   ```

3. **Check for stale status:**
   ```bash
   ginko agent list --status stale
   ```

### Task Claim Conflicts (409)

This is expected behavior - another agent claimed the task first.

```bash
# Check who claimed it
ginko agent list --status active
```

### Orchestrator Exits with Code 75

This means a checkpoint was saved. Resume with:
```bash
ginko orchestrate --resume
```

### Events Not Syncing

Check the DLQ for failed events:
```bash
ginko dlq list
ginko dlq stats
ginko dlq retry-all
```

### Notifications Not Delivering

1. **Test the hook:**
   ```bash
   ginko notifications test <hook-id>
   ```

2. **Check history:**
   ```bash
   ginko notifications history
   ```

3. **Verify webhook URL** in `ginko.config.json`

### Stale Agent Detection

Agents that miss heartbeats are marked stale and their tasks released:
```bash
# List stale agents
ginko agent list --status stale

# Default threshold: 5 minutes (300 seconds)
# Configure in ginko.config.json
```

---

## Best Practices

### 1. Use Checkpoints Before Risky Changes
```bash
ginko checkpoint create --task TASK-1 --message "Before DB migration"
# Make changes...
# If something breaks, rollback via git
```

### 2. Set Appropriate Severity on Escalations
- `critical`: Multiple agents blocked, immediate human needed
- `high`: Single agent blocked, hours to respond
- `medium`: Workaround exists, day to respond
- `low`: Clarification nice-to-have

### 3. Monitor the DLQ
```bash
# Daily check
ginko dlq stats

# Clean up old entries
ginko dlq cleanup --days 30
```

### 4. Configure Notifications for Observability
At minimum, set up alerts for:
- `escalation.critical`
- `agent.stale`
- `sprint.completed`

### 5. Use Dry-Run Before Orchestration
```bash
ginko orchestrate --dry-run
```

### 6. Design Tasks with Clear Acceptance Criteria
```markdown
**Acceptance:**
- [ ] Unit tests pass (npm test)
- [ ] Build succeeds (npm run build)
- [ ] No new lint errors (npm run lint)
- [ ] API response < 200ms
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Human Observability                       │
│  (Slack / Discord / Teams / Webhook Notifications)          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ escalations, alerts
┌─────────────────────────────────────────────────────────────┐
│                    Ginko API (Vercel)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Agent  │ │  Task   │ │Checkpoint│ │Escalation│          │
│  │   API   │ │   API   │ │   API   │ │   API   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP + JSON
┌─────────────────────────────────────────────────────────────┐
│                    Agent Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Orchestrator│  │   Worker    │  │   Worker    │         │
│  │   Agent     │  │   Agent 1   │  │   Agent 2   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ events, claims
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │   Neo4j Graph DB    │  │   Event Stream      │          │
│  │  (agents, tasks,    │  │  (.ginko/sessions)  │          │
│  │   relationships)    │  │                     │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [ADR-051: AI-to-AI Collaboration](../adr/ADR-051-ai-to-ai-collaboration.md)
- [EPIC-004: AI-to-AI Collaboration](../sprints/EPIC-004-ai-to-ai-collaboration.md)
- [ADR-033: Context Pressure Mitigation](../adr/ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-043: Event-Based Context Loading](../adr/ADR-043-event-based-context-loading.md)

---

*Last updated: 2025-12-07 | EPIC-004 Complete*
