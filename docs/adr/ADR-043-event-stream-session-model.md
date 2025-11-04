---
type: decision
status: proposed
updated: 2025-11-04
tags: [sessions, event-stream, context-pressure, architecture, cursor]
related: [ADR-033-context-pressure-mitigation-strategy.md, ADR-039-graph-based-context-discovery.md, ADR-042-ai-assisted-knowledge-graph-quality.md]
priority: critical
audience: [developer, ai-agent, stakeholder]
estimated-read: 12-min
dependencies: [ADR-033, ADR-039]
---

# ADR-043: Event Stream Session Model with Read Cursors

**Status:** Proposed
**Date:** 2025-11-04
**Authors:** Chris Norton, Claude (AI Assistant)
**Reviewers:** Chris Norton
**Related:** ADR-033 (Context Pressure Mitigation), ADR-039 (Knowledge Discovery Graph)

## Context

### The Problem: Sessions Are Artificial Boundaries

**Current session model** treats collaboration as discrete episodes with hard boundaries:

```
Session 1: [Start → Work → Context fills → Pressure builds → Synthesize handoff → End]
           ↓ (Flow state lost, context must be reconstructed)
Session 2: [Start → Load handoff → Rebuild context → Work → Pressure → End]
           ↓ (Cycle repeats)
```

**Key problems:**

1. **Handoff synthesis under pressure** - Must create high-quality summary at 85-95% context utilization when AI quality is degraded
2. **Flow state disruption** - Context window limits force premature session boundaries, breaking momentum
3. **Human pressure perception** - "Time is running out" feeling as context fills creates stress and rushed decisions
4. **Artificial work boundaries** - Sessions end due to technical limits (context window), not logical completion
5. **Context reconstruction cost** - Each new session requires expensive context reload (28 docs, 88K tokens)
6. **Lost continuity** - Events between sessions harder to query as cohesive timeline

### The Insight: Sessions Are Technical Artifacts, Not Work Boundaries

**From human perspective:**
> "I have a constant perception of time running out as the context window fills. I have to balance completing work while valuable context is still available against starting a new session where the fresh AI partner needs to load context and return to flow state."
> — Chris Norton, 2025-11-04

**Sessions exist because:**
- ❌ AI models have fixed context windows (technical limitation)
- ❌ We must periodically "reset" to avoid degradation

**Sessions should NOT dictate:**
- ❌ When to stop working (logical boundary)
- ❌ When to synthesize understanding (cognitive milestone)
- ❌ How to organize event history (query structure)

### The Git Parallel

Git doesn't have "sessions" - it has **continuous commit history** with **movable pointers** (HEAD, branches):

```bash
# Git: Unbounded commit DAG with cursors
main:    [c1] → [c2] → [c3] → [c4] → [c5]
                         ↑                ↑
                       HEAD          origin/main

# Context: Read backwards from cursor
git log -20    # Last 20 commits from HEAD

# No session boundaries - just continuous history
```

**What if AI collaboration worked the same way?**

```bash
# Event stream: Unbounded event log with cursors
events: [e1] → [e2] → [e3] → [e4] → [e5] → ...
                        ↑                ↑
                   cursor1          cursor2

# Context: Read backwards from cursor
ginko log recent -20   # Last 20 events from cursor

# No session boundaries - just continuous logging
```

### ADR-033 Revisited

[ADR-033](ADR-033-context-pressure-mitigation-strategy.md) introduced **defensive logging** to mitigate context pressure:
- Log events throughout session (low pressure)
- Synthesize handoffs from accumulated logs (high pressure)

**ADR-033 was a tactical solution. This is the strategic solution:**
- Eliminate handoff synthesis entirely
- Make "sessions" just read cursors into event stream
- Load context by reading backwards N events
- No pressure at "session end" - just update cursor and flush

## Decision

We adopt an **event stream model with read cursors** where:

1. **Events are logged continuously** to an unbounded append-only stream
2. **Sessions become cursors** - pointers into the event stream, not containers
3. **Context loading** reads backwards N events from cursor position
4. **"Starting work"** creates/resumes a cursor
5. **"Ending work"** updates cursor position and flushes pending events (no synthesis)
6. **Multiple cursors** support parallel work contexts (branches, tasks)

**The paradigm shift:**
- ❌ Session = bounded container requiring synthesis
- ✅ Session = read cursor into unbounded event stream

## Architecture

### Core Concepts

#### 1. Event Stream (Unbounded, Append-Only)

```cypher
// Events form a temporal linked list
(user:User)-[:LOGGED]->(e1:Event)
(e1)-[:NEXT]->(e2:Event)
(e2)-[:NEXT]->(e3:Event)
// ... continues indefinitely
```

**Event Properties:**
```typescript
interface Event {
  id: string;              // 'event_1730736293000_abc123'
  user_id: string;         // Who logged this
  project_id: string;      // Which project
  timestamp: Date;         // When it happened
  category: EventCategory; // fix|feature|decision|insight|git|achievement
  description: string;     // Rich context (WHY, not just WHAT)
  files: string[];         // Files mentioned
  impact: 'high|medium|low';
  pressure: number;        // Context pressure when logged (0-1)
  branch: string;          // Git branch context
  tags: string[];          // For filtering

  // Team collaboration
  shared: boolean;         // Team visibility (default: false)
  commit_hash?: string;    // Git commit reference (if applicable)
}

type EventCategory =
  | 'fix'          // Bug fixes
  | 'feature'      // New functionality
  | 'decision'     // Key decisions with alternatives
  | 'insight'      // Patterns, gotchas, learnings
  | 'git'          // Commits, merges, branch changes
  | 'achievement'; // Milestones reached
```

#### 2. Session Cursor (Movable Pointer)

```cypher
// User has multiple cursors (one per work context)
(user:User)-[:HAS_CURSOR]->(cursor:SessionCursor {
  id: 'cursor_feature_auth',
  user_id: 'xtophr@gmail.com',
  project_id: 'gin_xxx',
  started: datetime('2025-11-04T10:00:00Z'),
  last_active: datetime('2025-11-04T14:30:00Z'),
  current_event_id: 'event_500',     // Position in stream
  last_loaded_event_id: 'event_480', // What AI last saw
  branch: 'feature/auth',
  status: 'active|paused',           // No 'ended' - just paused
  context_snapshot: {}               // Optional: cached context
})

// Cursor points to current position in event stream
(cursor)-[:POSITIONED_AT]->(event:Event)
```

**Key insight:** Cursor is lightweight metadata, not a container of events.

#### 3. Event Relationships (Graph Navigation)

```cypher
// Temporal chain (read backwards for history)
(event1)-[:NEXT]->(event2)-[:NEXT]->(event3)

// Event mentions documents
(event)-[:MENTIONS]->(adr:ADR)
(event)-[:MENTIONS]->(prd:PRD)

// Event creates artifacts
(event)-[:CREATED]->(adr:ADR)
(event)-[:MODIFIED]->(file:CodeFile)
(event)-[:COMMITTED]->(commit:GitCommit)

// Event part of work context
(cursor)-[:POSITIONED_AT]->(event)
(user)-[:LOGGED]->(event)
```

### Neo4j Schema

```cypher
// ============================================================
// Event Stream Schema
// ============================================================

// Event node
CREATE CONSTRAINT event_id_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE INDEX event_timestamp IF NOT EXISTS
FOR (e:Event) ON (e.timestamp);

CREATE INDEX event_user_project IF NOT EXISTS
FOR (e:Event) ON (e.user_id, e.project_id);

CREATE INDEX event_category IF NOT EXISTS
FOR (e:Event) ON (e.category);

// SessionCursor node
CREATE CONSTRAINT cursor_id_unique IF NOT EXISTS
FOR (c:SessionCursor) REQUIRE c.id IS UNIQUE;

CREATE INDEX cursor_user IF NOT EXISTS
FOR (c:SessionCursor) ON (c.user_id);

CREATE INDEX cursor_status IF NOT EXISTS
FOR (c:SessionCursor) ON (c.status);

// ============================================================
// Queries
// ============================================================

// Create event
CREATE (e:Event {
  id: $id,
  user_id: $userId,
  project_id: $projectId,
  timestamp: datetime(),
  category: $category,
  description: $description,
  files: $files,
  impact: $impact,
  pressure: $pressure,
  branch: $branch,
  tags: $tags,
  shared: $shared,           // Team visibility (default: false)
  commit_hash: $commitHash   // Git commit reference (optional)
})
WITH e
MATCH (u:User {id: $userId})
CREATE (u)-[:LOGGED]->(e)

// Link to previous event (temporal chain)
WITH e
OPTIONAL MATCH (prev:Event)
WHERE prev.user_id = $userId
  AND prev.project_id = $projectId
ORDER BY prev.timestamp DESC
LIMIT 1
FOREACH (p IN CASE WHEN prev IS NOT NULL THEN [prev] ELSE [] END |
  CREATE (p)-[:NEXT]->(e)
)
RETURN e;

// Read backwards from cursor (context loading)
MATCH (cursor:SessionCursor {id: $cursorId})-[:POSITIONED_AT]->(current:Event)
MATCH path = (current)<-[:NEXT*0..50]-(e:Event)
WHERE e.project_id = $projectId
  AND (e.branch = $branch OR $branch IS NULL)
RETURN e
ORDER BY e.timestamp DESC
LIMIT 50;

// Query events by category (decisions, insights, etc.)
MATCH (u:User {id: $userId})-[:LOGGED]->(e:Event)
WHERE e.category IN $categories
  AND e.timestamp > datetime() - duration({days: 7})
  AND (e.project_id = $projectId OR $projectId IS NULL)
RETURN e
ORDER BY e.timestamp DESC;

// Find events mentioning document
MATCH (e:Event)-[:MENTIONS]->(doc {id: $docId})
WHERE e.user_id = $userId
RETURN e
ORDER BY e.timestamp DESC;
```

### Implementation Patterns

#### Pattern 1: Logging Events (Dual-Write)

```typescript
/**
 * Log event to stream with dual-write for reliability
 */
async function logEvent(entry: EventEntry): Promise<void> {
  const event = {
    id: generateEventId(),
    user_id: getCurrentUser(),
    project_id: getCurrentProject(),
    timestamp: new Date(),
    ...entry
  };

  // 1. Write to local file immediately (no network delay)
  await appendToLocalLog(event);

  // 2. Add to async queue for Neo4j
  eventQueue.push(event);

  // 3. Schedule sync (non-blocking)
  scheduleSyncIfNeeded();

  console.log(`✓ Event logged: ${event.category} - ${event.description.slice(0, 50)}...`);
}

/**
 * Sync queued events to Neo4j
 * Triggered every 5 minutes OR every 5 events (whichever first)
 */
async function syncEventsToGraph(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = eventQueue.splice(0, 20); // Batch up to 20

  try {
    await graphClient.createEvents(events);
    console.log(`✓ Synced ${events.length} events to graph`);
  } catch (error) {
    // On failure, events preserved in local file
    console.warn('⚠ Graph sync failed, events remain in local log');
    eventQueue.unshift(...events); // Return to queue
  }
}

// Trigger conditions
setInterval(syncEventsToGraph, 5 * 60 * 1000); // Every 5 minutes
eventQueue.on('push', () => {
  if (eventQueue.length >= 5) syncEventsToGraph(); // Every 5 events
});
```

#### Pattern 2: Starting Work (Create/Resume Cursor)

```typescript
/**
 * Start work: Create or resume cursor
 * No "loading previous session" - just read backwards from cursor
 */
async function startWork(): Promise<SessionCursor> {
  const branch = await getCurrentGitBranch();
  const project = await getCurrentProject();

  // Try to find existing cursor for this context
  let cursor = await findCursor({ branch, project, status: 'paused' });

  if (cursor) {
    // Resume existing cursor
    await updateCursor(cursor.id, {
      status: 'active',
      last_active: new Date()
    });
    console.log(`✓ Resumed work on ${branch}`);
  } else {
    // Create new cursor
    cursor = await createCursor({
      id: generateCursorId(branch),
      user_id: getCurrentUser(),
      project_id: project,
      branch,
      started: new Date(),
      last_active: new Date(),
      current_event_id: await getLatestEventId(),
      status: 'active'
    });
    console.log(`✓ Started new work context: ${branch}`);
  }

  // Load context by reading backwards from cursor
  const context = await loadContextFromCursor(cursor);

  return cursor;
}
```

#### Pattern 3: Loading Context (Read Backwards)

```typescript
/**
 * Load context by reading backwards from cursor position
 * Much simpler than synthesizing handoffs!
 */
async function loadContextFromCursor(
  cursor: SessionCursor,
  options: {
    eventLimit?: number;      // Default: 50
    documentDepth?: number;   // Graph depth: default 2
    categories?: EventCategory[]; // Filter by type
  } = {}
): Promise<Context> {
  const limit = options.eventLimit || 50;

  // 1. Read recent events backwards from cursor
  const recentEvents = await readEventsBackward(
    cursor.current_event_id,
    limit,
    { categories: options.categories }
  );

  // 2. Extract document references from events
  const mentionedDocs = extractDocumentReferences(recentEvents);

  // 3. Load mentioned documents
  const documents = await loadDocuments(mentionedDocs);

  // 4. Follow typed relationships (ADR-042)
  const relatedDocs = await followTypedRelationships(
    documents,
    options.documentDepth || 2
  );

  // 5. Get active sprint context
  const sprint = await getActiveSprint(cursor.project_id);

  return {
    cursor,           // Current position
    recentEvents,     // Last N actions
    documents,        // Docs mentioned in events
    relatedDocs,      // Graph neighborhood
    sprint,           // Current sprint goals
    loaded_at: new Date(),
    event_count: recentEvents.length,
    token_estimate: estimateTokens({
      recentEvents,
      documents,
      relatedDocs,
      sprint
    })
  };
}

/**
 * Read events backwards from cursor (Git log style)
 */
async function readEventsBackward(
  fromEventId: string,
  limit: number = 50,
  filters?: { categories?: EventCategory[] }
): Promise<Event[]> {
  return await graphClient.query(`
    MATCH (cursor:SessionCursor)-[:POSITIONED_AT]->(current:Event)
    MATCH path = (current)<-[:NEXT*0..${limit}]-(e:Event)
    WHERE e.project_id = $projectId
      ${filters?.categories ? 'AND e.category IN $categories' : ''}
    RETURN e
    ORDER BY e.timestamp DESC
    LIMIT ${limit}
  `, {
    projectId: getCurrentProject(),
    categories: filters?.categories
  });
}
```

#### Pattern 4: Ending Work (Update Cursor, Flush Queue)

```typescript
/**
 * End work: Update cursor and flush pending events
 * NO SYNTHESIS NEEDED - just housekeeping!
 */
async function endWork(cursor: SessionCursor): Promise<void> {
  console.log('Pausing work...');

  // 1. Flush any pending events to graph (housekeeping)
  await syncEventsToGraph();
  console.log('✓ Events synced to graph');

  // 2. Update cursor to latest position
  const latestEventId = await getLatestEventId();
  await updateCursor(cursor.id, {
    current_event_id: latestEventId,
    last_active: new Date(),
    status: 'paused'
  });
  console.log('✓ Cursor position saved');

  // 3. Archive local log file
  await archiveLocalLog();
  console.log('✓ Local log archived');

  console.log(`
✓ Work paused on ${cursor.branch}

Resume anytime with: ginko start
Recent events saved: ${eventQueue.length} synced
  `);

  // NO synthesis step!
  // NO high-pressure summarization!
  // Just update pointer and we're done.
}
```

#### Pattern 5: Querying Events (Git Log Style)

```typescript
/**
 * Query events like git log
 * Flexible, composable filters
 */

// Recent events
ginko log recent --limit=20
// MATCH (e:Event) ORDER BY timestamp DESC LIMIT 20

// Events by category
ginko log --decisions --insights
// MATCH (e:Event) WHERE category IN ['decision', 'insight']

// Events mentioning document
ginko log --mentions=ADR-042
// MATCH (e:Event)-[:MENTIONS]->(doc {id: 'ADR-042'})

// Events in time range
ginko log --since=2025-11-01
// MATCH (e:Event) WHERE timestamp > datetime('2025-11-01')

// Events by impact
ginko log --impact=high --category=fix
// MATCH (e:Event) WHERE impact = 'high' AND category = 'fix'

// Search event descriptions
ginko log --search="authentication"
// MATCH (e:Event) WHERE description CONTAINS 'authentication'
```

#### Pattern 6: Multi-Context Support (Multiple Cursors)

```typescript
/**
 * Support parallel work contexts via multiple cursors
 */

// Working on feature
$ cd ~/project
$ git checkout feature/auth
$ ginko start
// Creates/resumes cursor for feature/auth

// Switch to bugfix (preserves feature cursor)
$ git checkout hotfix/login-bug
$ ginko start
// Creates/resumes cursor for hotfix/login-bug

// Return to feature (exactly where you left off)
$ git checkout feature/auth
$ ginko start
// Resumes cursor for feature/auth from preserved position

// List active contexts
$ ginko status --all
Active work contexts:
  feature/auth       (12 events, last active 2h ago)
  hotfix/login-bug   (5 events, last active 30m ago)
  main               (paused 3d ago)
```

### Multi-Team Collaboration

**Key Insight:** The event stream architecture naturally supports teams without changes - just different queries.

#### Team Event Visibility (Query-Based)

**Events already have the fields needed for team filtering:**
```typescript
interface Event {
  user_id: string;      // Who logged it
  project_id: string;   // Which project
  branch: string;       // Git branch context
  category: string;     // decision|insight|achievement|fix|git
  shared: boolean;      // Opt-in team visibility
}
```

**No architectural changes needed - just query patterns.**

#### Query Pattern 1: My Events Only

```cypher
// Solo context loading
MATCH (me:User {id: $myUserId})-[:LOGGED]->(e:Event)
WHERE e.project_id = $projectId
ORDER BY e.timestamp DESC
LIMIT 50
```
**Use case:** Individual developer working alone

#### Query Pattern 2: Team High-Signal Events

```cypher
// Load team decisions and achievements (not noise)
MATCH (user:User)-[:LOGGED]->(e:Event)
WHERE e.project_id = $projectId
  AND e.user_id != $myUserId  // Others' events
  AND e.shared = true
  AND e.category IN ['decision', 'achievement', 'git']
  AND e.timestamp > (now() - duration({days: 7}))
ORDER BY e.timestamp DESC
LIMIT 20
```
**Use case:** See key team decisions without noise

**What gets shared:**
- ✅ Decisions (impact team)
- ✅ Achievements (coordination points)
- ✅ Git events (commits, merges, branches)
- ❌ Fixes, insights, features (too noisy, private by default)

#### Query Pattern 3: Branch Activity

```cypher
// Events on branches I care about
MATCH (user:User)-[:LOGGED]->(e:Event)
WHERE e.project_id = $projectId
  AND (e.branch = $myBranch OR e.branch = 'main')
  AND e.shared = true
ORDER BY e.timestamp DESC
```
**Use case:** See what's happening on my feature branch + main

#### Query Pattern 4: Document Collision Detection

```cypher
// Who else recently touched documents I'm editing?
MATCH (me:User {id: $myUserId})-[:WORKING_ON]->(doc)
MATCH (event:Event)-[:MENTIONS]->(doc)
WHERE event.user_id != $myUserId
  AND event.timestamp > (now() - duration({hours: 4}))
RETURN event, doc
ORDER BY event.timestamp DESC
```
**Use case:** Alert "Alice edited ADR-042 2h ago" when you start editing it

#### Query Pattern 5: Team Activity Feed

```cypher
// Combined team timeline
MATCH (user:User)-[:LOGGED]->(e:Event)
WHERE e.project_id = $projectId
  AND e.shared = true
  AND e.timestamp > (now() - duration({days: 1}))
RETURN e, user.name
ORDER BY e.timestamp DESC
LIMIT 50
```
**Use case:** `ginko feed --team` shows everyone's activity

#### Team Context Loading Strategy

**Phase 1: My Events (Always)**
```typescript
const myEvents = await loadMyEvents(userId, 50);  // ~5K tokens
```

**Phase 2: Team High-Signal (Optional)**
```typescript
const teamEvents = await loadTeamEvents({
  projectId,
  excludeUserId: userId,
  categories: ['decision', 'achievement', 'git'],
  limit: 20
});  // ~3K tokens
```

**Phase 3: Branch Activity (Optional)**
```typescript
const branchEvents = await loadBranchEvents({
  branches: [currentBranch, 'main'],
  limit: 10
});  // ~2K tokens
```

**Total team context: ~10K tokens (5K mine + 5K team)**

#### Event Sharing Control

**Default: Private**
```bash
# Events are private by default
ginko log "Fixing bug in auth.ts" --category=fix
# → shared=false (only I see this)

# High-impact decisions auto-share
ginko log "Chose JWT over sessions" --category=decision --impact=high
# → shared=true (team sees this)

# Manual sharing
ginko log "Discovered bcrypt optimal rounds" --category=insight --share
# → shared=true
```

**Smart defaults:**
- `decision + high impact` → auto-share
- `achievement` → auto-share
- `git` (if pushed) → auto-share
- Everything else → private unless `--share`

#### Git Integration

**Ginko events complement git commits:**

| Aspect | Git | Ginko |
|--------|-----|-------|
| Code changes | ✅ Diff | ❌ |
| WHAT changed | ✅ Commit | ❌ |
| WHY it changed | ⚠️ Message | ✅ Rich context |
| Alternatives considered | ❌ | ✅ |
| Decisions leading to commit | ❌ | ✅ |
| Patterns learned | ❌ | ✅ |

**Git hooks auto-log to ginko:**
```bash
# post-commit hook
ginko log "Committed JWT implementation" \
  --category=git \
  --commit=$(git rev-parse HEAD) \
  --files=$(git diff-tree --no-commit-id --name-only -r HEAD)
```

**Bidirectional navigation:**
```bash
# From commit → ginko events
ginko log --commit=7a3b2c1
# Shows: decision → feature → git commit → achievement

# From ginko event → related commits
ginko log show event_12345
# Shows: Related commits: 7a3b2c1, 8b4c3d2
```

**No architectural changes needed - just queries and hooks.**

### Event-Driven Architecture Patterns

**The Opportunity:** Event streams aren't just for context loading - they enable real-time reactive systems.

#### Pattern 1: Real-Time Notifications

```typescript
// Subscribe to high-impact events
eventStream.on('event', (event) => {
  if (event.impact === 'high' && event.category === 'decision') {
    notifyTeam({
      title: 'Key Decision Made',
      description: event.description,
      author: event.user_id,
      timestamp: event.timestamp
    });
  }
});

// Example: Slack notification when ADR created
eventStream.on('event', (event) => {
  if (event.category === 'achievement' && event.description.includes('ADR')) {
    slackWebhook.send({
      text: `🎯 New ADR created: ${event.description}`,
      channel: '#architecture'
    });
  }
});
```

#### Pattern 2: Automated Workflows

```typescript
// Trigger CI/CD when code committed
eventStream.on('event', (event) => {
  if (event.category === 'git' && event.branch === 'main') {
    triggerBuild({
      branch: event.branch,
      commit: extractCommitHash(event),
      triggeredBy: event.user_id
    });
  }
});

// Auto-create relationships when ADR mentions PRD
eventStream.on('event', async (event) => {
  if (event.category === 'feature' && event.description.includes('ADR-')) {
    const prdRefs = extractPRDReferences(event.description);
    for (const prdId of prdRefs) {
      await suggestRelationship({
        type: 'IMPLEMENTS',
        source: extractADRId(event),
        target: prdId,
        confidence: 0.8
      });
    }
  }
});
```

#### Pattern 3: Analytics and Metrics

```typescript
// Track development velocity
eventStream.on('event', (event) => {
  if (event.category === 'achievement') {
    metrics.increment('achievements_per_day');
    metrics.recordTime('time_to_achievement',
      event.timestamp - event.cursor.started);
  }
});

// Identify patterns in decision-making
eventStream.on('event', (event) => {
  if (event.category === 'decision') {
    analytics.track('decision_made', {
      impact: event.impact,
      pressure: event.pressure,
      files_touched: event.files.length,
      time_of_day: event.timestamp.getHours()
    });
  }
});
```

#### Pattern 4: Context-Aware AI Assistants

```typescript
// AI watches event stream for opportunities to help
eventStream.on('event', async (event) => {
  // Detect repeated patterns suggesting need for automation
  const recentSimilar = await findSimilarEvents(event, {
    window: '7d',
    threshold: 0.8
  });

  if (recentSimilar.length >= 3) {
    await suggestAutomation({
      pattern: event.description,
      occurrences: recentSimilar.length,
      suggestion: 'Create script or pattern for this repeated task?'
    });
  }

  // Detect "stuck" indicators (many fixes without achievement)
  const recentEvents = await getRecentEvents(20);
  const fixCount = recentEvents.filter(e => e.category === 'fix').length;
  const achievementCount = recentEvents.filter(e => e.category === 'achievement').length;

  if (fixCount > 5 && achievementCount === 0) {
    await offerHelp({
      message: 'Noticed several fixes without progress. Need help debugging?',
      context: recentEvents
    });
  }
});
```

#### Pattern 5: Event Replay and Time Travel

```typescript
// Replay events for debugging
async function replaySession(fromEventId: string, toEventId: string): Promise<void> {
  const events = await getEventRange(fromEventId, toEventId);

  for (const event of events) {
    console.log(`[${event.timestamp}] ${event.category}: ${event.description}`);

    // Reconstruct state at each step
    if (event.category === 'git') {
      await checkoutCommit(extractCommitHash(event));
    }
  }
}

// "What was I thinking at 3pm yesterday?"
async function timeTravel(timestamp: Date): Promise<Context> {
  const eventsUntil = await getEventsUntil(timestamp);
  const context = await reconstructContext(eventsUntil);
  return context;
}
```

#### Pattern 6: Cross-Project Learning

```typescript
// Learn patterns across all users
eventStream.onAny(async (event) => {
  if (event.category === 'insight') {
    // Store insights in global knowledge base
    await globalKnowledge.add({
      insight: event.description,
      context: event.tags,
      source: event.project_id,
      validated_by: [event.user_id]
    });

    // Suggest to other users working on similar problems
    const similarContextUsers = await findUsersWithSimilarContext(event.tags);
    for (const user of similarContextUsers) {
      await suggestInsight(user, event);
    }
  }
});
```

#### Pattern 7: Compliance and Audit Trails

```typescript
// Immutable audit log for compliance
eventStream.on('event', async (event) => {
  // Every event permanently logged for audit
  await auditLog.append({
    event_id: event.id,
    user: event.user_id,
    action: event.category,
    description: event.description,
    timestamp: event.timestamp,
    hash: sha256(JSON.stringify(event)) // Tamper detection
  });

  // Alert on sensitive operations
  if (event.files.some(f => f.includes('.env') || f.includes('secret'))) {
    await securityAlert({
      severity: 'high',
      message: 'Sensitive file modified',
      event_id: event.id,
      user: event.user_id
    });
  }
});
```

**Key Benefits:**

1. **Reactive Systems** - Components react to events without polling
2. **Decoupled Architecture** - Event producers don't know about consumers
3. **Real-Time Processing** - No batch delays, immediate response
4. **Scalable Integration** - Add new consumers without changing producers
5. **Audit Trail** - Complete history of what happened and why
6. **Replay Capability** - Reconstruct state at any point in time
7. **Pattern Detection** - Learn from event patterns across users/projects
8. **Async Workflows** - Long-running processes triggered by events

### Context Loading Strategy

**Solo Developer Mode:**

**Phase 1: Read Recent Events (Always)**
```cypher
// Last 50 events from cursor
MATCH path = (cursor)-[:POSITIONED_AT]->(current)<-[:NEXT*0..50]-(e)
WHERE e.user_id = $userId  // My events only
RETURN e ORDER BY e.timestamp DESC
```
**Cost:** ~5K tokens (50 events × ~100 tokens each)

**Team Collaboration Mode (Optional):**

**Phase 1a: Add Team High-Signal Events**
```cypher
// Team decisions and achievements (not noise)
MATCH (user:User)-[:LOGGED]->(e:Event)
WHERE e.project_id = $projectId
  AND e.user_id != $userId
  AND e.shared = true
  AND e.category IN ['decision', 'achievement', 'git']
  AND e.timestamp > (now() - duration({days: 7}))
RETURN e
ORDER BY e.timestamp DESC
LIMIT 20
```
**Cost:** ~3K tokens (20 team events × ~150 tokens each)

**Total with team context: ~8K tokens**

**Phase 2: Load Referenced Documents (Mentioned in Events)**
```cypher
// Documents mentioned in recent events
MATCH (e:Event)-[:MENTIONS]->(doc)
WHERE e.id IN $recentEventIds
RETURN DISTINCT doc
```
**Cost:** ~10K tokens (10-15 docs × ~700 tokens each)

**Phase 3: Follow Typed Relationships (Graph Navigation)**
```cypher
// From mentioned docs, follow high-value relationships
MATCH (doc)-[r:IMPLEMENTS|REFERENCES|APPLIES_TO]->(related)
WHERE r.confidence > 0.8
RETURN related
```
**Cost:** ~10K tokens (additional related docs)

**Phase 4: Active Sprint Context**
```cypher
// Current sprint goals and tasks
MATCH (sprint:Sprint {status: 'active'})
WHERE sprint.project_id = $projectId
RETURN sprint
```
**Cost:** ~5K tokens (sprint summary)

**Total Context Budget:** ~30K tokens (vs 88K in file-based approach)

### Migration Strategy

**Phase 1: Dual-Write Events (Week 1)**
- Implement event logging to local files + async queue
- Sync queue to Neo4j every 5 minutes
- Keep existing session files as backup
- Test event stream reliability

**Phase 2: Implement Cursors (Week 2)**
- Add SessionCursor nodes to Neo4j
- Create cursor on `ginko start`
- Update cursor on `ginko handoff` (no synthesis yet)
- Maintain backward compatibility with file-based sessions

**Phase 3: Context Loading from Events (Week 3)**
- Implement `loadContextFromCursor()`
- Read backwards N events instead of loading full handoffs
- Compare context quality (event-based vs handoff-based)
- Validate token savings

**Phase 4: Remove Synthesis (Week 4)**
- Make handoff synthesis optional
- Default to cursor-based context loading
- Archive old session files
- Full event stream operational

## Consequences

### Positive Impacts

**1. Eliminates Context Pressure at Session Boundaries**
- ❌ Before: Must synthesize handoff at 85-95% context pressure
- ✅ After: Just flush events and update cursor (no synthesis)
- **Impact:** No degraded AI quality at "session end"

**2. Preserves Flow State**
- ❌ Before: Session ends → context lost → rebuild flow (5-10 minutes)
- ✅ After: Read last 50 events → continue immediately (<30 seconds)
- **Impact:** 10-20x faster session transitions

**3. Reduces Human Pressure Perception**
- ❌ Before: "Time running out, must handoff soon"
- ✅ After: "Context full? New cursor, continue working"
- **Impact:** Removes artificial deadline stress

**4. Enables Flexible Context Queries**
- ❌ Before: Load everything, or load nothing
- ✅ After: Query by category, time, mentions, impact
- **Impact:** Load only relevant context (30K vs 88K tokens)

**5. Supports Multi-Context Work**
- ❌ Before: One session at a time
- ✅ After: Multiple cursors for parallel contexts
- **Impact:** Switch between tasks without losing state

**6. Provides Complete Timeline**
- ❌ Before: Events fragmented across session boundaries
- ✅ After: Continuous event stream, queryable like Git log
- **Impact:** Better historical understanding

**7. Simplifies Implementation**
- ❌ Before: Complex handoff synthesis logic (ADR-033)
- ✅ After: Simple cursor updates and event reads
- **Impact:** Less code, fewer edge cases

**8. Enables Event-Driven Architecture**
- ❌ Before: Session files = opaque blobs, can't react to events
- ✅ After: Events = first-class entities, can trigger workflows
- **Impact:** Real-time processing, integrations, automation

### Negative Impacts

**1. Breaking Change**
- Existing session files won't work with cursor model
- Migration required for historical sessions
- **Mitigation:** Phase migration, maintain backward compatibility temporarily

**2. Neo4j Dependency**
- Event stream requires graph database
- Offline mode needs local fallback
- **Mitigation:** Dual-write to local files, sync when online

**3. Event Stream Growth**
- Unbounded stream grows indefinitely
- Storage costs increase over time
- **Mitigation:** Archive old events (>6 months), retention policies

**4. Query Performance**
- Reading backwards through long chains may be slow
- **Mitigation:** Index on timestamp, cache recent events, limit depth

### Neutral Impacts

**Cognitive Model Shift**
- Developers must think in "event streams" not "sessions"
- Learning curve for new mental model
- Trade-off: More powerful, but requires understanding

## Alternatives Considered

### Option 1: Improve Handoff Synthesis (ADR-033 Approach)

**Description:** Keep session boundaries, but improve synthesis quality via defensive logging

**Pros:**
- Incremental improvement on existing model
- Maintains familiar "session" concept
- ADR-033 already implemented

**Cons:**
- Doesn't solve root problem (artificial boundaries)
- Still requires synthesis under pressure
- Doesn't enable flexible context queries
- Flow state still disrupted at boundaries

**Decision:** Rejected - Tactical solution to structural problem

### Option 2: Infinite Context Windows

**Description:** Wait for AI models with unlimited context

**Pros:**
- Eventually solves problem
- No architecture changes needed

**Cons:**
- Timeline uncertain (years?)
- Cost may be prohibitive even when available
- Doesn't solve query/navigation problems
- Passive waiting vs active solution

**Decision:** Rejected - Architectural solution better than waiting

### Option 3: Hierarchical Sessions

**Description:** Session contains sub-sessions, tree structure

**Pros:**
- Organizes work hierarchically
- Maintains session boundaries

**Cons:**
- Added complexity (tree navigation)
- Still requires synthesis at boundaries
- Doesn't solve flow disruption
- Artificial hierarchy may not match work

**Decision:** Rejected - Adds complexity without solving core issues

### Option 4: Snapshot-Based Continuity

**Description:** Periodic context snapshots, resume from snapshot

**Pros:**
- Faster resume than full synthesis
- Works with session boundaries

**Cons:**
- Snapshots are just cached handoffs
- Still lose events between snapshots
- Doesn't enable flexible queries
- Arbitrary snapshot timing

**Decision:** Rejected - Half-measure compared to event stream

## Implementation Plan

### Week 1: Event Logging Infrastructure

**Goals:**
- Dual-write event logging (local file + async queue)
- Neo4j event schema and indexes
- Background sync process

**Tasks:**
1. Create Event node schema in Neo4j
2. Implement `logEvent()` with dual-write
3. Create async sync queue (5 min / 5 events)
4. Add `ginko log` CLI integration
5. Test reliability (offline, network errors)

**Deliverables:**
- [ ] Event schema deployed to production Neo4j
- [ ] `logEvent()` writing to local + queue
- [ ] Background sync running
- [ ] 90%+ sync reliability

### Week 2: Session Cursors

**Goals:**
- SessionCursor nodes in Neo4j
- Create cursor on `ginko start`
- Update cursor on `ginko handoff`

**Tasks:**
1. Create SessionCursor schema
2. Implement `createCursor()` and `updateCursor()`
3. Modify `ginko start` to create/resume cursor
4. Modify `ginko handoff` to update cursor (keep synthesis for now)
5. Add cursor status display

**Deliverables:**
- [ ] Cursor schema in Neo4j
- [ ] `ginko start` creates/resumes cursor
- [ ] `ginko handoff` updates cursor
- [ ] Backward compatibility maintained

### Week 3: Context Loading from Events

**Goals:**
- Load context by reading backwards from cursor
- Compare quality vs handoff-based loading
- Validate token savings

**Tasks:**
1. Implement `loadContextFromCursor()`
2. Implement `readEventsBackward()`
3. Extract document references from events
4. Follow typed relationships (2 hops)
5. Benchmark: tokens used, load time, quality
6. Add `--event-based` flag to `ginko start`

**Deliverables:**
- [ ] Context loading from events working
- [ ] Quality equivalent to handoff-based
- [ ] Token usage: <35K (vs 88K baseline)
- [ ] Load time: <2 seconds

### Week 4: Remove Synthesis Requirement

**Goals:**
- Make handoff synthesis optional
- Default to event-based context loading
- Archive old session model

**Tasks:**
1. Make `ginko handoff` skip synthesis by default
2. Add `--synthesize` flag for backward compat
3. Update documentation (new mental model)
4. Archive migration of old session files
5. Monitor adoption and quality

**Deliverables:**
- [ ] Synthesis optional, not required
- [ ] Event-based loading as default
- [ ] Documentation updated
- [ ] Old sessions migrated

### Week 5: Advanced Features

**Goals:**
- Multi-cursor support
- Advanced event queries
- Cursor management

**Tasks:**
1. Multiple cursors per user (branch-based)
2. `ginko log` query commands (--decisions, --since, etc.)
3. `ginko status --all` (show all cursors)
4. Cursor switching (change branch, resume cursor)
5. Event archive policy (>6 months)

**Deliverables:**
- [ ] Multi-cursor support working
- [ ] Rich event query API
- [ ] Cursor management CLI
- [ ] Archive policy implemented

## Success Metrics

### Technical Success (Week 4)

- [ ] Event stream operational (95%+ sync reliability)
- [ ] Context loading from events (<35K tokens)
- [ ] Cursor-based resumption working
- [ ] Zero synthesis required
- [ ] Load time <2 seconds
- [ ] Multi-cursor support functional

### User Experience Success (Week 8)

- [ ] Session transitions <30 seconds (vs 5-10 minutes)
- [ ] No "time pressure" reports from users
- [ ] Flow state preserved across transitions
- [ ] Context quality maintained or improved
- [ ] Advanced queries being used

### Business Success (Month 3)

- [ ] 80%+ users adopt event-based model
- [ ] Session transition friction eliminated
- [ ] Context costs reduced 50%+ (token savings)
- [ ] Positive feedback on continuity
- [ ] Advanced use cases emerging (multi-context, queries)

## Monitoring and Operations

### Event Stream Health

```typescript
interface EventStreamMetrics {
  totalEvents: number;
  eventsToday: number;
  syncReliability: number;      // % events synced successfully
  avgSyncLatency: number;        // Seconds to sync
  queueDepth: number;            // Pending events
  oldestPending: Date;           // Oldest unsynced event
}
```

### Cursor Health

```typescript
interface CursorMetrics {
  totalCursors: number;
  activeCursors: number;
  pausedCursors: number;
  avgCursorAge: number;          // Days since created
  avgEventsBetweenPauses: number;
  multiCursorUsers: number;      // Users with >1 cursor
}
```

### Context Loading Performance

```typescript
interface ContextLoadMetrics {
  avgLoadTimeMs: number;
  avgTokensLoaded: number;
  eventsReadBack: number;        // Avg events read per load
  documentsLoaded: number;       // Avg docs loaded
  cacheHitRate: number;          // % cached vs fresh
}
```

## References

### Related ADRs

- [ADR-033: Context Pressure Mitigation Strategy](ADR-033-context-pressure-mitigation-strategy.md) - Tactical solution this supersedes
- [ADR-039: Graph-Based Context Discovery](ADR-039-graph-based-context-discovery.md) - Graph foundation
- [ADR-042: AI-Assisted Knowledge Graph Quality](ADR-042-ai-assisted-knowledge-graph-quality.md) - Typed relationships for navigation

### Inspiration

- **Git:** Unbounded commit DAG with movable pointers (HEAD, branches)
- **Event Sourcing:** Append-only event log as source of truth
- **CQRS:** Separate write model (events) from read model (cursors)
- **Kafka:** Distributed commit log with consumer offsets (cursors)

### External References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html) - Martin Fowler
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) - Martin Fowler
- [Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) - Pro Git Book

---

## Key Insights

**Sessions Are Technical Artifacts:** The concept of a "session" with hard boundaries exists because of AI context window limitations, not because it's a natural unit of work. By recognizing this, we can design around the limitation rather than let it dictate workflow.

**Event Streams Match Human Cognition:** Humans don't work in discrete episodes - we have continuous threads of thought with pauses and resumptions. Event streams with cursors match this natural pattern.

**Read Cursors > Write Boundaries:** Instead of trying to synthesize perfect summaries at boundaries (write-heavy), we simply read backwards from a cursor (read-heavy). Reading is cheaper and more flexible than writing.

**The Git Parallel:** Git's success comes from separating storage (commit DAG) from navigation (HEAD, branches). We apply the same pattern: events are storage, cursors are navigation.

**Query-Driven Discovery:** With events as queryable data, we can load context based on what we need (decisions, insights, recent work) rather than loading everything or nothing.

**Eliminates Artificial Pressure:** The human feeling of "time running out" is caused by approaching session boundaries. Event streams remove the boundary, removing the pressure.

**Simplicity Through Elimination:** The best code is code you don't have to write. Eliminating handoff synthesis removes ~500 lines of complex logic and all its edge cases.

**Future-Proof Architecture:** As context windows grow, event streams still make sense (query-driven is better than "load everything"). As they shrink, we just read fewer events backwards. The model is robust to context window changes.

---

**Update History:**

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-04 | Chris Norton, Claude | Initial version - Event stream session model with read cursors |
| 2025-11-04 | Chris Norton, Claude | Added multi-team collaboration patterns (query-based, no architectural changes) and git integration |
