# Cloud-First Knowledge Graph Architecture

**Status**: Planning → Implementation
**Date**: 2025-10-28
**Related**: PRD-010 (Cloud-First Knowledge Graph Platform), ADR-039

## Strategic Pivot: Local CLI + Cloud Neo4j

### Architecture Overview

```
┌─────────────────────────────────────┐
│  User's Workstation                 │
│  ┌───────────────────────────────┐  │
│  │  ginko CLI                    │  │
│  │  - git-native (local fs)      │  │
│  │  - Context loading            │  │
│  │  - Session management         │  │
│  └───────────┬───────────────────┘  │
│              │ HTTPS + API Key      │
└──────────────┼──────────────────────┘
               │
               │ TLS encrypted
               ▼
┌─────────────────────────────────────┐
│  Hetzner Cloud (Docker)             │
│  ┌───────────────────────────────┐  │
│  │  Neo4j Knowledge Graph        │  │
│  │  - Multi-tenant (project_id)  │  │
│  │  - 60 ADRs + 29 PRDs          │  │
│  │  - Vector embeddings          │  │
│  │  - Full-text search           │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  API Gateway / Auth Layer     │  │
│  │  - API key validation         │  │
│  │  - Rate limiting              │  │
│  │  - Project isolation          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Decisions

1. **✅ No Local Neo4j**: Zero setup friction, instant onboarding
2. **✅ Cloud-Only for Go-Live**: Simplifies MVP, faster deployment
3. **✅ Vector Embeddings Pre-Launch**: Build semantic search before users arrive
4. **✅ Aggressive Timeline**: 1-2 weeks to production (no legacy users)

---

## 1. Connection Architecture

### CLI Configuration

**File**: `.ginko/config.yml` (local, git-ignored)

```yaml
cloud:
  apiKey: "gk_live_abc123..."  # From ginko.ai/settings
  endpoint: "https://graph.ginko.ai"  # Cloud Neo4j endpoint

project:
  id: "proj_a1b2c3d4"  # Auto-generated on first use
  name: "my-awesome-project"
```

### Environment Variables (Alternative)

```bash
# .env (git-ignored)
GINKO_API_KEY=gk_live_abc123...
GINKO_GRAPH_ENDPOINT=https://graph.ginko.ai
GINKO_PROJECT_ID=proj_a1b2c3d4
```

### Connection Flow

```typescript
// packages/cli/src/graph/cloud-client.ts
export class CloudGraphClient {
  private apiKey: string;
  private endpoint: string;
  private projectId: string;

  constructor() {
    // Load from config or env
    this.apiKey = process.env.GINKO_API_KEY || config.cloud.apiKey;
    this.endpoint = process.env.GINKO_GRAPH_ENDPOINT || config.cloud.endpoint;
    this.projectId = process.env.GINKO_PROJECT_ID || config.project.id;
  }

  async connect(): Promise<void> {
    // Connect to cloud Neo4j with API key auth
    this.driver = neo4j.driver(
      this.endpoint,
      neo4j.auth.bearer(this.apiKey),
      {
        encrypted: 'ENCRYPTION_ON',
        trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES',
        maxConnectionPoolSize: 10  // Lower for cloud
      }
    );

    await this.verifyConnection();
  }

  async query(cypher: string, params: any): Promise<Result> {
    // All queries automatically scoped to project_id
    return this.driver.session().run(cypher, {
      ...params,
      projectId: this.projectId  // Auto-inject for multi-tenancy
    });
  }
}
```

---

## 2. Authentication System

### API Key Generation

**Service**: `api/auth/generate-key.ts` (Vercel serverless)

```typescript
export async function generateApiKey(userId: string): Promise<string> {
  const key = `gk_${env}_${randomBytes(32).toString('hex')}`;

  // Store in Supabase
  await supabase.from('api_keys').insert({
    key_hash: hashApiKey(key),  // Never store plaintext
    user_id: userId,
    created_at: new Date(),
    last_used_at: null,
    rate_limit: 1000  // requests per hour
  });

  return key;  // Only shown once
}
```

### Authentication Middleware

**Service**: `api/auth/validate.ts`

```typescript
export async function validateApiKey(key: string): Promise<{
  userId: string;
  projectId: string;
  tier: 'free' | 'pro' | 'enterprise';
}> {
  const hash = hashApiKey(key);

  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, project_id, tier, rate_limit')
    .eq('key_hash', hash)
    .single();

  if (error || !data) {
    throw new UnauthorizedError('Invalid API key');
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date() })
    .eq('key_hash', hash);

  return data;
}
```

### Rate Limiting

```typescript
// In-memory rate limiter (or Redis for distributed)
const rateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 1000  // requests per hour
});

app.use('/api/graph/*', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const { userId } = await validateApiKey(apiKey);

  if (!rateLimiter.check(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  next();
});
```

---

## 3. Multi-Tenancy Strategy

### Project Isolation (Already Implemented!)

**Schema**: All nodes have `project_id` property ✅

```cypher
// Every query auto-scoped
MATCH (doc:ADR {project_id: $projectId})
WHERE ...
RETURN doc
```

**Enforcement**: Server-side in cloud API

```typescript
// api/graph/query.ts
export async function executeQuery(req: Request): Promise<Response> {
  const { userId, projectId } = await validateApiKey(req.headers['x-api-key']);

  // Inject project_id into all queries (security)
  const params = {
    ...req.body.params,
    projectId  // Override any user-provided projectId
  };

  const result = await neo4j.query(req.body.cypher, params);
  return Response.json(result);
}
```

### Project Setup

**CLI Command**: `ginko init`

```bash
$ ginko init

🌿 Ginko Cloud Setup

📧 Email: chris@watchhill.ai
🔑 API Key: gk_live_abc123... (paste from ginko.ai/settings)

✓ Connected to cloud
✓ Created project: proj_a1b2c3d4
✓ Syncing local repository...
  - 60 ADRs uploaded
  - 29 PRDs uploaded
  - Generating embeddings... (2 minutes)
✓ Ready!

Next: Run 'ginko start' to begin your session
```

---

## 4. Vector Embeddings Pipeline

### Server-Side Processing (Pre-Launch)

**Goal**: Semantic similarity search ("find decisions like this")

**Architecture**:

```
┌──────────────────────────────────┐
│  Document Ingestion              │
│  (ginko init, git webhook)       │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  Embedding Generation            │
│  (OpenAI text-embedding-3-large) │
│  - Chunk documents (~500 tokens) │
│  - Generate 3072-dim vectors     │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  Vector Storage                  │
│  (Neo4j vector index)            │
│  - CREATE VECTOR INDEX           │
│  - Enable similarity search      │
└──────────────────────────────────┘
```

### Implementation

**1. Add Embedding Property to Schema**

```cypher
// Add vector property to nodes
ALTER TABLE ADR ADD COLUMN embedding VECTOR(3072);
ALTER TABLE PRD ADD COLUMN embedding VECTOR(3072);

// Create vector index
CREATE VECTOR INDEX adr_embedding_index IF NOT EXISTS
FOR (a:ADR)
ON a.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 3072,
    `vector.similarity_function`: 'cosine'
  }
};
```

**2. Embedding Generation Service**

```typescript
// api/embeddings/generate.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072  // High quality
  });

  return response.data[0].embedding;
}

export async function embedDocument(docId: string, content: string): Promise<void> {
  // Chunk if too long (>8k tokens)
  const chunks = chunkText(content, 500);

  // Generate embeddings
  const embeddings = await Promise.all(
    chunks.map(chunk => generateEmbedding(chunk))
  );

  // Average embeddings (or store multiple)
  const avgEmbedding = averageVectors(embeddings);

  // Store in Neo4j
  await neo4j.query(`
    MATCH (doc {id: $docId})
    SET doc.embedding = $embedding
  `, { docId, embedding: avgEmbedding });
}
```

**3. Similarity Search**

```typescript
// packages/cli/src/graph/context-graph.ts
async findSimilar(docId: string, limit: number = 5): Promise<LoadedDocument[]> {
  const results = await this.neo4j.query(`
    MATCH (source {id: $docId})
    CALL db.index.vector.queryNodes('adr_embedding_index', $limit, source.embedding)
    YIELD node, score
    WHERE node.id <> $docId  // Exclude self
      AND node.project_id = $projectId
    RETURN node, score
    ORDER BY score DESC
  `, { docId, limit, projectId: this.projectId });

  return this.nodesToDocuments(results);
}
```

**4. Batch Processing Script**

```bash
# Initial embedding generation (before go-live)
npm run embeddings:generate

# Output:
# Processing 60 ADRs...
# ✓ ADR-001 embedded (1.2s)
# ✓ ADR-002 embedded (1.1s)
# ...
# ✓ 60/60 ADRs complete
#
# Processing 29 PRDs...
# ✓ 29/29 PRDs complete
#
# Total cost: $0.47 (OpenAI API)
# Total time: 3m 12s
```

---

## 5. Hetzner Deployment

### Docker Compose Setup

**File**: `infrastructure/docker-compose.yml`

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15-enterprise  # Or community for MVP
    container_name: ginko-neo4j-cloud
    restart: unless-stopped
    ports:
      - "7474:7474"  # Browser UI (internal only)
      - "7687:7687"  # Bolt protocol
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc", "graph-data-science"]
      - NEO4J_dbms_memory_heap_max__size=4G
      - NEO4J_dbms_memory_pagecache_size=2G
      - NEO4J_server_bolt_advertised__address=graph.ginko.ai:7687
      - NEO4J_server_https_advertised__address=graph.ginko.ai:7473
    volumes:
      - neo4j-data:/data
      - neo4j-logs:/logs
      - neo4j-import:/var/lib/neo4j/import
      - ./backups:/backups
    networks:
      - ginko-network

  nginx:
    image: nginx:alpine
    container_name: ginko-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # Let's Encrypt certs
    depends_on:
      - neo4j
    networks:
      - ginko-network

volumes:
  neo4j-data:
  neo4j-logs:
  neo4j-import:

networks:
  ginko-network:
    driver: bridge
```

### Nginx Reverse Proxy

**File**: `infrastructure/nginx.conf`

```nginx
upstream neo4j_bolt {
    server neo4j:7687;
}

server {
    listen 443 ssl http2;
    server_name graph.ginko.ai;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Bolt protocol proxy
    location / {
        proxy_pass http://neo4j_bolt;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Auth check (API key validation)
        auth_request /auth;
    }

    # Auth endpoint
    location = /auth {
        internal;
        proxy_pass https://api.ginko.ai/auth/validate;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-API-Key $http_x_api_key;
    }
}
```

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Ginko Knowledge Graph to Hetzner"

# 1. SSH to server
ssh root@graph.ginko.ai << 'ENDSSH'
  cd /opt/ginko

  # 2. Pull latest config
  git pull origin main

  # 3. Stop existing containers
  docker-compose down

  # 4. Pull new images
  docker-compose pull

  # 5. Start services
  docker-compose up -d

  # 6. Wait for health check
  sleep 10
  docker exec ginko-neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD "RETURN 1"

  echo "✓ Deployment complete"
ENDSSH

echo "🎉 Cloud graph is live at graph.ginko.ai"
```

---

## 6. Aggressive Implementation Plan (1-2 Weeks)

### Week 1: Core Infrastructure

**Day 1-2: Cloud Client + Auth**
- [ ] Create `CloudGraphClient` class
- [ ] API key authentication
- [ ] Connection pooling
- [ ] Multi-tenancy enforcement

**Day 3-4: Vector Embeddings**
- [ ] OpenAI integration
- [ ] Embedding generation pipeline
- [ ] Vector index setup
- [ ] Similarity search implementation

**Day 5: CLI Integration**
- [ ] Update `ginko start` to use cloud
- [ ] Update `ginko context` commands
- [ ] Add `ginko init` for onboarding

**Day 6-7: Hetzner Deployment**
- [ ] Docker Compose setup
- [ ] Nginx reverse proxy
- [ ] SSL certificates (Let's Encrypt)
- [ ] Deploy to Hetzner
- [ ] Load initial data (60 ADRs + 29 PRDs)

### Week 2: Testing + Launch

**Day 8-9: Embedding Generation**
- [ ] Run batch embedding generation
- [ ] Test similarity search quality
- [ ] Tune chunking strategy
- [ ] Validate performance

**Day 10-11: End-to-End Testing**
- [ ] CLI → Cloud connection tests
- [ ] Multi-user isolation tests
- [ ] Rate limiting tests
- [ ] Performance benchmarks

**Day 12-13: Documentation**
- [ ] API key setup guide
- [ ] Onboarding flow
- [ ] Troubleshooting docs
- [ ] Migration guide (file → graph)

**Day 14: Go-Live**
- [ ] Final smoke tests
- [ ] Launch to beta users
- [ ] Monitor logs and metrics
- [ ] Iterate based on feedback

---

## 7. Cost Estimates

### OpenAI Embeddings

**Model**: `text-embedding-3-large` ($0.00013 per 1k tokens)

**Initial Load**:
- 60 ADRs × ~1000 tokens = 60k tokens
- 29 PRDs × ~1500 tokens = 43.5k tokens
- **Total**: ~103.5k tokens = **$0.013**

**Ongoing** (per document):
- ~1000 tokens × $0.00013 = **$0.00013 per doc**

### Hetzner Hosting

**Server**: CX21 (2 vCPU, 4GB RAM, 40GB SSD) = **€5.83/month**
- Sufficient for 100-500 projects
- Scale to CX31 (€11.66/month) for 1000+ projects

**Bandwidth**: Included (20TB/month)

**Backups**: €1/month (automated daily)

**Total**: **~$7/month** for MVP hosting

---

## 8. Success Metrics

### Performance KPIs
- ✅ Query latency <100ms (validated locally)
- ✅ Connection time <500ms
- ✅ 99.9% uptime (Hetzner SLA)

### Feature KPIs
- Vector similarity search working
- Multi-tenant isolation verified
- API key auth functional
- Rate limiting effective

### Business KPIs
- Zero setup friction (no local Neo4j)
- <5 minute onboarding (from `ginko init` to first query)
- <$10/month hosting costs (MVP)
- Ready for monetization (API key tiers)

---

## 9. Future Enhancements (Post-Launch)

1. **GraphQL API** (instead of raw Cypher)
2. **Real-time sync** (websockets for live updates)
3. **Team collaboration** (shared project graphs)
4. **Enterprise self-hosted** (Docker image for download)
5. **Advanced analytics** (pattern discovery, trend analysis)
6. **AI-powered recommendations** ("You might want to read ADR-X")

---

## References

- [PRD-010: Cloud-First Knowledge Graph Platform](../prd/PRD-010-cloud-first-knowledge-graph.md)
- [ADR-039: Knowledge Discovery Graph](../adr/ADR-039-graph-based-context-discovery.md)
- [Migration Plan](./graph-retrieval-migration.md)
- [Neo4j Vector Search Docs](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
