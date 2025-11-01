# Knowledge Graph Implementation Plan

## Executive Summary

The Ginko knowledge graph uses a **self-hosted architecture** where users connect to a centralized Neo4j instance hosted on Hetzner. This provides 77-92x cost savings vs Neo4j AuraDS while maintaining full control and performance.

## Architecture Decision (Updated 2025-10-31)

### ✅ REVISED: Self-Hosted Neo4j on Hetzner

**Cost Analysis:**
- Neo4j AuraDS: $2,304-4,608/month ($27K-55K/year)
- Hetzner VPS: $30-50/month ($360-600/year)
- **Savings: $27,000-55,000 annually (77-92x cheaper)**

**User Flow:**
```bash
ginko login                    # OAuth via GitHub (already exists)
ginko graph init              # Scans project, creates namespace
ginko graph load              # Uploads documents to hosted Neo4j
ginko graph query "search"    # Queries hosted Neo4j directly
```

**Benefits:**
- ✅ 77-92x cost savings vs AuraDS
- ✅ Full control over infrastructure
- ✅ Better margins (90%+ vs 50%)
- ✅ Team sharing by default
- ✅ Scales to 100K+ documents
- ✅ Direct Neo4j connection (faster than API middleware)
- ✅ No vendor lock-in

**Infrastructure:**
- **Phase 1-2**: Hetzner CCX23 VPS (4 vCPU, 16GB RAM, $30/month)
- **Phase 3+**: Hetzner Dedicated Server ($50-100/month)

### ❌ Rejected: Neo4j AuraDS Cloud

**Pricing:**
- $0.40/GB/hour = $288/GB/month
- Minimum 8-16GB = $2,304-4,608/month
- Annual cost: $27,648-55,296

**Drawbacks:**
- 77-92x more expensive than self-hosted
- Vendor lock-in to Neo4j
- Lower margins (need to pass costs to users)
- Less control over infrastructure
- Overkill for MVP/early stage

## Implementation Phases

### Phase 1: MVP CLI Commands (Week 1)
**Goal:** Basic graph operations through API

**Commands to implement:**
1. `ginko graph init` - Initialize project graph
2. `ginko graph load` - Upload documents to cloud
3. `ginko graph status` - View graph statistics
4. `ginko graph query <text>` - Semantic search
5. `ginko graph explore <docId>` - View connections

**API endpoints needed:**
```
POST /api/v1/graph/init
POST /api/v1/graph/documents
GET  /api/v1/graph/status
POST /api/v1/graph/query
GET  /api/v1/graph/explore/:documentId
```

**Authentication:**
- Reuse existing `ginko login` OAuth flow
- Store token in `~/.ginko/auth.json`
- Include token in all API requests

**Files to create:**
```
packages/cli/src/commands/graph/
  ├── init.ts          # Scan & initialize
  ├── load.ts          # Upload documents
  ├── status.ts        # Show statistics
  ├── query.ts         # Semantic search
  ├── explore.ts       # Document connections
  └── index.ts         # Command registry
```

### Phase 2: Incremental Sync (Week 2)
**Goal:** Smart updates for changed documents

**Commands:**
- `ginko graph sync` - Incremental update
- `ginko graph rebuild` - Full rebuild

**Features:**
- Track document hashes locally
- Only upload changed documents
- Cloud merges updates efficiently

### Phase 3: Team Collaboration (Week 3)
**Goal:** Multi-user workflows

**Commands:**
- `ginko graph share --team` - Enable team access
- `ginko graph share --public` - Make discoverable
- `ginko graph contributors` - View team activity

**Features:**
- Organization-level sharing
- Activity feeds
- Conflict resolution for simultaneous updates

### Phase 4: Advanced Features (Week 4+)
**Commands:**
- `ginko graph export` - Export to JSON/GraphML
- `ginko graph diagram <docId>` - Generate mermaid diagrams
- `ginko graph analyze` - Insights and metrics
- `ginko graph compare <branch1> <branch2>` - Diff graphs across branches

## API Schema

### Authentication
All requests include auth header:
```http
Authorization: Bearer {token_from_ginko_login}
```

### Endpoints

#### POST /api/v1/graph/init
Initialize a new project graph.

**Request:**
```json
{
  "projectPath": "/Users/chris/projects/ginko",
  "projectName": "ginko",
  "visibility": "private",
  "organization": "watchhill-ai",
  "documents": {
    "adr": 40,
    "prd": 10,
    "patterns": 15,
    "gotchas": 5,
    "sessions": 64
  }
}
```

**Response:**
```json
{
  "namespace": "/watchhill-ai/ginko",
  "graphId": "gin_abc123xyz",
  "status": "created",
  "estimatedProcessingTime": 45
}
```

#### POST /api/v1/graph/documents
Upload documents for processing.

**Request:**
```json
{
  "graphId": "gin_abc123xyz",
  "documents": [
    {
      "id": "ADR-039",
      "type": "ADR",
      "title": "Knowledge Discovery Graph",
      "content": "# ADR-039...",
      "filePath": "docs/adr/ADR-039.md",
      "hash": "sha256:abc123..."
    },
    // ... more documents
  ]
}
```

**Response:**
```json
{
  "job": {
    "jobId": "job_xyz789",
    "status": "processing",
    "progress": {
      "uploaded": 137,
      "parsed": 45,
      "embedded": 0,
      "total": 137
    }
  }
}
```

#### GET /api/v1/graph/status?graphId=gin_abc123xyz
Get graph statistics.

**Response:**
```json
{
  "namespace": "/watchhill-ai/ginko",
  "visibility": "private",
  "nodes": {
    "total": 137,
    "byType": {
      "ADR": 40,
      "PRD": 10,
      "Pattern": 15,
      "Gotcha": 5,
      "Session": 64,
      "ContextModule": 3
    }
  },
  "relationships": {
    "total": 298,
    "byType": {
      "SIMILAR_TO": 278,
      "APPLIES_TO": 8,
      "REFERENCES": 5,
      "IMPLEMENTS": 3,
      "LEARNED_FROM": 2,
      "SUPERSEDES": 1,
      "MITIGATED_BY": 1
    }
  },
  "lastSync": "2025-10-31T18:45:23Z",
  "health": "healthy"
}
```

#### POST /api/v1/graph/query
Semantic search.

**Request:**
```json
{
  "graphId": "gin_abc123xyz",
  "query": "authentication patterns",
  "limit": 10,
  "threshold": 0.70,
  "types": ["ADR", "Pattern"]
}
```

**Response:**
```json
{
  "results": [
    {
      "document": {
        "id": "ADR-019",
        "type": "ADR",
        "title": "Claude Code SDK Agent Architecture",
        "summary": "Architectural decision for...",
        "tags": ["auth", "sdk", "architecture"]
      },
      "similarity": 0.89,
      "connections": 7
    },
    // ... more results
  ],
  "totalResults": 15,
  "queryTime": 45
}
```

#### GET /api/v1/graph/explore/:documentId?graphId=gin_abc123xyz
Explore document connections.

**Response:**
```json
{
  "document": {
    "id": "ADR-039",
    "type": "ADR",
    "title": "Knowledge Discovery Graph",
    "summary": "...",
    "tags": ["graph", "neo4j", "ai"]
  },
  "relationships": {
    "implements": [
      { "id": "PRD-010", "title": "Cloud-First Knowledge Graph" }
    ],
    "referencedBy": [
      { "id": "ADR-040", "title": "Graph Query Optimization" }
    ],
    "similarTo": [
      {
        "id": "ADR-028",
        "title": "First-Use Experience",
        "similarity": 0.85
      }
    ],
    "appliedPatterns": [
      { "id": "PATTERN-human-ai-collaboration", "title": "..." }
    ]
  },
  "totalConnections": 9
}
```

## Configuration

### Local Config (`.ginko/graph/config.json`)
```json
{
  "version": "1.0",
  "graphId": "gin_abc123xyz",
  "namespace": "/watchhill-ai/ginko",
  "projectName": "ginko",
  "visibility": "private",
  "apiEndpoint": "https://api.ginko.ai",
  "documents": {
    "adr": { "enabled": true, "path": "docs/adr" },
    "prd": { "enabled": true, "path": "docs/PRD" },
    "patterns": { "enabled": true, "path": ".ginko/context/modules" },
    "sessions": { "enabled": true, "path": ".ginko/sessions" }
  },
  "hashes": {
    "ADR-039.md": "sha256:abc123...",
    // ... more file hashes for sync
  },
  "lastSync": "2025-10-31T18:45:23Z"
}
```

### Global Auth Config (`~/.ginko/auth.json`)
Already exists from `ginko login`:
```json
{
  "accessToken": "github_pat_...",
  "user": {
    "githubId": "xtophr",
    "email": "chris@watchhill.ai",
    "organizations": ["watchhill-ai"]
  },
  "expiresAt": "2025-11-30T00:00:00Z"
}
```

## Multi-Tenancy Design

### Namespace Isolation
```
Hetzner Neo4j Instance (Self-Hosted)
├─ /user-123/
│  ├─ /ginko/
│  │  ├─ ADR-001, ADR-002, ...
│  │  └─ relationships...
│  └─ /other-project/
│     └─ ...
└─ /user-456/
   └─ /their-project/
       └─ ...
```

**Query Isolation:**
- All Cypher queries automatically scoped by userId and projectName
- Users authenticated via JWT token (Supabase)
- Example: `MATCH (n:ADR {userId: 'user-123', project: 'ginko'})`

**Storage Efficiency:**
- 10K docs = ~300MB storage
- 16GB RAM supports 50-100K docs comfortably
- Multiple users share same instance (multi-tenant)

### Sharing Levels
1. **Private (default)** - Only you
2. **Organization** - Team members (future)
3. **Public** - Anyone (for open-source)

## Migration Path

### For Current Local Development
We've been developing with local Neo4j. Here's how to transition:

**Option 1: Dual Mode (Phase 1)**
```typescript
// src/graph/client.ts
if (process.env.GINKO_CLOUD_MODE === 'true') {
  // Use API client
  return new CloudGraphClient(apiEndpoint, token);
} else {
  // Use direct Neo4j
  return new Neo4jClient(neo4jConfig);
}
```

**Option 2: Cloud-First (Phase 2)**
- Remove local Neo4j client
- All operations through API
- Simplify codebase significantly

## Next Steps

### Immediate (This Sprint)
1. ✅ Document onboarding design (this file)
2. ⬜ Create API endpoint specs
3. ⬜ Implement Phase 1 CLI commands
4. ⬜ Build cloud API endpoints
5. ⬜ Test end-to-end flow

### Short-term (Next Sprint)
1. Implement Phase 2 (sync)
2. Add Phase 3 (team features)
3. Beta test with 5-10 users
4. Gather feedback and iterate

### Long-term (Q1 2026)
1. Phase 4 advanced features
2. Enterprise features (SSO, compliance)
3. Self-hosted option for enterprises
4. GraphQL API for advanced integrations

## Success Metrics

### User Experience
- **Onboarding time**: < 2 minutes from `ginko login` to first query
- **Initial load time**: < 60 seconds for 100 documents
- **Query latency**: < 500ms p95
- **Sync time**: < 10 seconds for typical change sets

### Adoption
- **Week 1**: 10 beta users
- **Month 1**: 100 active projects
- **Quarter 1**: 1000 users, 50 paid accounts

### Technical
- **Uptime**: 99.9% SLA
- **API latency**: < 200ms p95
- **Storage**: < 1MB per 100 documents
- **Cost per user**: < $5/month (including Neo4j Aura)

## Questions to Resolve

1. **Rate limiting**: How many queries/day for free tier?
2. **Document size limits**: Max size per document? Per project?
3. **Embedding model**: all-mpnet-base-v2 or OpenAI ada-002?
4. **Webhook support**: Notify on graph changes for integrations?
5. **Export formats**: Just JSON or also GraphML, RDF, others?

## References

- [Onboarding Documentation](./GRAPH_ONBOARDING.md)
- [API Specification](./API_SPEC.md) (to be created)
- [Neo4j Aura Documentation](https://neo4j.com/docs/aura/)
- [Multi-tenant Graph Design](https://neo4j.com/developer/multi-tenancy-worked-example/)
