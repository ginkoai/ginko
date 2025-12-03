---
type: decision
status: accepted
updated: 2025-11-25
tags: [architecture, natural-language, ai-integration, graph-queries, epic-003]
related: [ADR-047-strategic-context-surfacing.md, ADR-002-ai-readable-code-frontmatter.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 8-min
dependencies: []
---

# ADR-049: Natural Language Project Queries via Ambient AI

**Status:** Accepted
**Date:** 2025-11-25
**Authors:** Claude (AI Partner), Chris Norton
**Epic:** EPIC-003 Natural Language Enhancements

## Context

### Problem Statement

Team members (human and AI) need to ask factual questions about the project:

- "What's our sprint progress?"
- "How do we handle authentication?"
- "What is Alice working on?"
- "Show me ADRs about caching"

### Initial Approach: Build a `ginko ask` Command

The original design proposed a dedicated command with:
- Intent classification (~6 intent types)
- Query routing (graph vs local files)
- Response synthesis (LLM-based formatting)
- Estimated effort: ~43 hours

### Vibecheck Insight

During planning, we asked: "Do we need a new command, or can we just instruct the ambient AI partner to use the graph to answer questions?"

Key realizations:
1. The AI assistant is already running (Claude Code, Cursor, etc.)
2. AI can call APIs directly via curl
3. AI can read local files
4. AI can interpret results and respond naturally

### Revised Approach: Teach the AI

Instead of building infrastructure, teach the AI how to query data sources directly through documentation.

## Decision

**Teach the ambient AI to query project data directly via CLAUDE.md instructions.**

No new CLI command required. Update `ginko init` template to include:
1. Graph API query patterns (curl examples)
2. Local file fallback locations
3. Common query recipes

### Implementation

Add `PROJECT_KNOWLEDGE_QUERIES` section to `packages/cli/src/templates/ai-instructions-template.ts`:

```typescript
private static readonly PROJECT_KNOWLEDGE_QUERIES = `
## Answering Project Questions (EPIC-003)

When users ask factual questions about the project, query available data sources directly.

### Graph API (When Available)
- Semantic search: POST /api/v1/graph/query
- List by type: GET /api/v1/graph/nodes?labels=ADR

### Local Files (Fallback)
| Question Type | File Location |
|--------------|---------------|
| Sprint progress | docs/sprints/CURRENT-SPRINT.md |
| Architecture decisions | docs/adr/ADR-*.md |
| Recent activity | .ginko/sessions/[user]/current-events.jsonl |

### Common Query Recipes
- Sprint progress: grep checkboxes ([x], [@], [ ])
- ADR lookup: grep -l -i "topic" docs/adr/*.md
- Team activity: grep session logs
`;
```

## Rationale

### Why Not Build a Command?

| Factor | `ginko ask` Command | Teach AI via CLAUDE.md |
|--------|-------------------|------------------------|
| Development time | ~43 hours | ~6 hours |
| Maintenance burden | CLI code to maintain | Documentation to update |
| Flexibility | Fixed intent types | Natural language understanding |
| AI model agnostic | Yes | Yes |
| Works offline | With local fallbacks | Same |
| Latency | CLI startup + LLM call | Zero (AI already running) |

### Key Advantages

1. **Simplicity**: No new code paths to maintain
2. **Flexibility**: AI can handle edge cases naturally
3. **Consistency**: Same AI that assists with code also answers questions
4. **Extensibility**: Add new query patterns by updating documentation
5. **Cost**: No additional LLM API calls (uses ambient AI's existing context)

### Trade-offs Accepted

1. **Depends on ambient AI quality**: Poor AI assistants may not follow instructions well
2. **Non-deterministic**: AI may interpret queries differently each time
3. **Requires CLAUDE.md**: Projects must be initialized with ginko for instructions to exist

## Consequences

### Positive

- EPIC-003 delivered in ~6 hours vs ~43 hours
- No new CLI command to learn
- Natural language flexibility
- Template ensures all new projects get the capability

### Negative

- Graph API endpoints still needed (deferred infrastructure)
- AI assistants without CLAUDE.md support won't work
- Quality depends on AI's ability to follow instructions

### Neutral

- Local file fallbacks work regardless of graph availability
- Users can extend query patterns in their own CLAUDE.md

## Implementation Status

### Phase 1: Documentation (Complete)
- [x] TASK-1: Add PROJECT_KNOWLEDGE_QUERIES to template
- [x] TASK-2: Update local CLAUDE.md with same content
- [x] TASK-3: Document credential setup
- [x] TASK-4: Test local file fallbacks
- [x] TASK-5: Create this ADR

### Phase 2: Graph Endpoints (Complete - 2025-11-25)
- [x] TASK-6: Add GET /api/v1/graph/nodes endpoint for listing/filtering
- [x] TASK-7: Add POST /api/v1/graph/query endpoint for semantic search
- [x] TASK-8: Update CLAUDE.md with final API patterns
- [x] TASK-9: Update this ADR

### Endpoints Created

**GET /api/v1/graph/nodes** - List and filter nodes
- Query params: `graphId` (required), `labels`, `limit`, `offset`, plus any property filter
- Returns paginated nodes with total count
- File: `dashboard/src/app/api/v1/graph/nodes/route.ts`

**POST /api/v1/graph/query** - Semantic search
- Body: `graphId`, `query`, `limit`, `labels[]`
- Uses Voyage AI embeddings for similarity search
- Returns ranked results with similarity scores
- File: `dashboard/src/app/api/v1/graph/query/route.ts`

## Future Work

1. **Deploy and test endpoints**: Endpoints created, need production deployment
2. **Team activity queries**: Enhanced filtering by user_id and time ranges
3. **Caching**: Cache common queries for faster response

## References

- [EPIC-003 Plan](/Users/cnorton/.claude/plans/zesty-painting-kite.md)
- [ai-instructions-template.ts](packages/cli/src/templates/ai-instructions-template.ts)
