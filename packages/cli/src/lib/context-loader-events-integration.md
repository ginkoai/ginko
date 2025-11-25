# Event-Based Context Loading Integration Guide

## Overview

This guide shows how to integrate the event-based context loader (ADR-043) with `ginko start` command to replace handoff-based context loading with continuous event stream reading.

## Architecture

```
Session Start
    ↓
Get/Create Cursor (session-cursor.ts)
    ↓
Load Context from Events (context-loader-events.ts)
    ├── Read my events backward (50)
    ├── Load team events (20, optional)
    ├── Extract document refs from events
    ├── Load documents from graph
    ├── Follow relationships (2 hops)
    └── Get active sprint
    ↓
Display Context Summary
    ↓
Ready to work
```

## Integration in start-reflection.ts

### Current Implementation (Handoff-Based)

```typescript
// Load previous session log
const previousSessionLog = await SessionLogManager.loadSessionLog(sessionDir);

// Synthesize handoff summary
const synthesis = await synthesizer.synthesize();

// Archive previous session
await SessionLogManager.archiveLog(sessionDir);

// Load context strategically (from filesystem)
const strategyContext = await loadContextStrategic({
  workMode,
  maxDepth: 3,
  followReferences: true,
  sessionDir,
  userSlug
});
```

### New Implementation (Event-Based)

```typescript
import { loadContextFromCursor, formatContextSummary } from '../../lib/context-loader-events.js';

// 1. Create or resume session cursor
const { cursor, isNew } = await getOrCreateCursor({});

// 2. Load context from event stream
const eventContext = await loadContextFromCursor(cursor, {
  eventLimit: 15,          // ~3 sessions worth of events
  includeTeam: true,       // Include team high-signal events
  teamEventLimit: 10,      // Team event limit
  categories: undefined,   // All categories (optional filter)
  documentDepth: 2,        // Follow relationships 2 hops
  teamDays: 7             // Team events from last 7 days
});

// 3. Display context summary
console.log(formatContextSummary(eventContext));

// Output:
// 📊 Context Loaded:
//    - 50 my events (last 3 days)
//    - 12 team events (decisions + achievements)
//    - 8 documents (5 ADRs, 3 PRDs)
//    - 15 related documents
//    - Sprint: Cloud Knowledge Graph (12% complete)
//    - Estimated tokens: 28K
```

## Token Budget Comparison

### Handoff-Based Loading
```
- Session handoff synthesis: ~3K tokens
- Current sprint: ~1K tokens
- Context modules loaded: ~15K tokens
- Referenced documents: ~70K tokens (via references)
Total: ~88K tokens
```

### Event-Based Loading
```
- My events (50 × 100): ~5K tokens
- Team events (20 × 150): ~3K tokens
- Documents (8 × 1000): ~8K tokens
- Related docs (15 × 1000): ~15K tokens
- Sprint: ~500 tokens
Total: ~31.5K tokens (64% reduction!)
```

## Benefits

1. **No synthesis under pressure** - Events are already logged at low pressure
2. **Richer context** - Raw events preserve nuance lost in summaries
3. **Team awareness** - Load team decisions/achievements automatically
4. **Graph-based discovery** - Follow document relationships intelligently
5. **Token efficiency** - 64% reduction in context tokens
6. **No handoff boundaries** - Sessions become read positions, not containers

## Implementation Phases

### Phase 1: Parallel Implementation (Current)
- Keep handoff-based loading as primary
- Add event-based loading as experimental flag
- Compare context quality side-by-side

```typescript
// In start-reflection.ts
if (options.eventContext) {
  // Use new event-based loading
  const eventContext = await loadContextFromCursor(cursor, {...});
} else {
  // Use existing handoff-based loading
  const strategyContext = await loadContextStrategic({...});
}
```

### Phase 2: API Endpoints
Create serverless endpoints for event queries:

1. **POST /api/v1/events/read** - Read events backward from cursor
2. **POST /api/v1/events/team** - Load team high-signal events
3. **POST /api/v1/graph/documents/batch** - Load documents by IDs
4. **GET /api/v1/graph/explore/{docId}** - Follow relationships

### Phase 3: Full Migration
- Make event-based loading default
- Remove handoff synthesis (keep logging)
- Update docs and examples

## Testing Strategy

### Quality Comparison Test
```typescript
// Load context both ways
const handoffContext = await loadContextStrategic({...});
const eventContext = await loadContextFromCursor(cursor, {...});

// Compare:
console.log('Handoff approach:', {
  documents: handoffContext.documents.size,
  tokens: handoffContext.metrics.totalTokens,
  time: handoffContext.metrics.bootstrapTimeMs
});

console.log('Event approach:', {
  documents: eventContext.documents.length,
  tokens: eventContext.token_estimate,
  time: Date.now() - startTime
});

// Verify event context provides equivalent or better information
```

### Integration Test
```bash
# Test with real session
ginko start --event-context --verbose

# Expected output:
# ✓ Session cursor created
# 📖 Reading 50 events backwards...
# 👥 Loading 20 team events...
# 📚 Loading 8 documents...
# 🔗 Following relationships 2 hops...
# 📊 Context Loaded:
#    - 50 my events (last 3 days)
#    - 12 team events
#    - 8 documents (5 ADRs, 3 PRDs)
#    - 15 related documents
#    - Estimated tokens: 28K
# ✓ Session initialized with event context!
```

## Migration Path for Existing Projects

### Option A: Gradual Migration
1. Continue logging events as normal
2. Add `--event-context` flag to `ginko start`
3. Compare quality for 1 week
4. Switch to default when satisfied

### Option B: Clean Break
1. Archive existing handoffs
2. Start fresh with event stream
3. Use event-based loading immediately

## FAQ

**Q: Do I lose historical context when switching?**
A: No. Events are already being logged. The change is in *how* we load context, not what we capture.

**Q: What if Neo4j is offline?**
A: Cursor falls back to local JSON storage. Event queries will use local session logs as fallback.

**Q: How do team events work?**
A: Only shared events (decisions, achievements, git) with `shared=true` are visible to team. Private events (fixes, features) stay private.

**Q: Can I filter events by category?**
A: Yes. Pass `categories: ['decision', 'achievement']` to only load specific event types.

**Q: Does this replace session logging?**
A: No! Logging continues as before. This only changes how we *read* context at session start.

## Next Steps

1. ✅ Create context-loader-events.ts (complete)
2. ⏳ Create API endpoints for event queries (pending)
3. ⏳ Add --event-context flag to ginko start (pending)
4. ⏳ Compare context quality vs handoff approach (pending)
5. ⏳ Document migration guide (this file)
6. ⏳ Make event-based loading default (future)
