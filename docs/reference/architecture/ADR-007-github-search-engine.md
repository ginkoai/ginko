---
type: architecture
status: draft
updated: 2025-08-02
tags: [search, performance, indexing, github, elasticsearch]
related: [ADR-001-remote-collaborative-architecture.md, ADR-002-ai-readable-code-frontmatter.md]
priority: critical
audience: developer
estimated-read: 10-min
dependencies: [ADR-001]
---

# ADR-006: GitHub-Indexed Search Engine Architecture

## Status
Draft

## Context
Current Ginko file searching relies on real-time filesystem operations, causing significant performance issues:
- Simple queries take 90+ seconds
- Consume 40K+ tokens
- Require 18+ tool calls
- Scale poorly with large codebases (10K+ files)

## Decision
Implement a pre-indexed search engine that indexes GitHub repositories and provides sub-second search capabilities with minimal token usage. Use Vercel's native infrastructure (Postgres + KV) to maintain architectural consistency and minimize costs.

## Architecture

### System Components

```typescript
// Core search engine architecture
interface SearchEngine {
  indexer: GitHubIndexer;        // Indexes repository content
  storage: IndexStorage;         // Stores search indices
  searcher: QueryEngine;         // Handles search queries
  updater: WebhookProcessor;     // Real-time index updates
  cache: QueryCache;             // Response caching layer
}
```

### 1. GitHub Indexer

**Purpose**: Crawl and index entire GitHub repositories

```typescript
class GitHubIndexer {
  async indexRepository(repo: string, branch: string): Promise<IndexResult> {
    // 1. Clone or pull latest repository state
    // 2. Parse all files and extract metadata
    // 3. Build search indices
    // 4. Store in database
  }

  async parseFile(path: string, content: string): Promise<FileIndex> {
    return {
      path,
      content: content,
      frontmatter: extractFrontmatter(content),
      imports: extractImports(content),
      exports: extractExports(content),
      functions: extractFunctions(content),
      classes: extractClasses(content),
      tags: extractTags(content),
      lastModified: getLastModified(path)
    };
  }
}
```

### 2. Index Storage

**Vercel Postgres Schema** (using existing Ginko database):
```sql
-- Main file index
CREATE TABLE file_index (
  id SERIAL PRIMARY KEY,
  repo_id UUID NOT NULL,
  branch VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  frontmatter JSONB,
  imports TEXT[],
  exports TEXT[],
  tags TEXT[],
  last_indexed TIMESTAMP DEFAULT NOW(),
  UNIQUE(repo_id, branch, file_path)
);

-- Full-text search index
CREATE INDEX file_content_fts ON file_index 
  USING gin(to_tsvector('english', content));

-- Metadata indices
CREATE INDEX file_tags_idx ON file_index USING gin(tags);
CREATE INDEX file_frontmatter_idx ON file_index USING gin(frontmatter);
```

**Future Enhancement** (Optional Elasticsearch):
If search demands exceed PostgreSQL full-text capabilities, Elasticsearch can be added as a dedicated search layer. For initial implementation, PostgreSQL's built-in full-text search provides sufficient functionality with lower operational complexity.

### 3. Query Engine

**Smart Search Capabilities**:
```typescript
class QueryEngine {
  async search(params: SearchParams): Promise<SearchResult> {
    // Query types supported
    switch (params.type) {
      case 'fulltext':
        return this.fulltextSearch(params);
      case 'semantic':
        return this.semanticSearch(params);
      case 'frontmatter':
        return this.frontmatterSearch(params);
      case 'dependency':
        return this.dependencySearch(params);
      case 'pattern':
        return this.patternSearch(params);
    }
  }

  async fulltextSearch(params: SearchParams): Promise<SearchResult> {
    // PostgreSQL full-text search
    const query = `
      SELECT file_path, ts_rank(content_vector, query) as rank,
             ts_headline(content, query) as snippet
      FROM file_index,
           plainto_tsquery('english', $1) query
      WHERE content_vector @@ query
      ORDER BY rank DESC
      LIMIT $2
    `;
    
    return this.executeQuery(query, [params.query, params.limit]);
  }
}
```

### 4. Real-time Updates

**GitHub Webhook Integration**:
```typescript
class WebhookProcessor {
  async handlePushEvent(payload: GitHubPushEvent): Promise<void> {
    const changes = this.extractChanges(payload);
    
    for (const change of changes) {
      switch (change.type) {
        case 'added':
        case 'modified':
          await this.indexFile(change.path);
          break;
        case 'removed':
          await this.removeFromIndex(change.path);
          break;
      }
    }
    
    // Invalidate relevant caches
    await this.cache.invalidatePattern(payload.repository);
  }
}
```

### 5. Caching Layer

**Vercel KV Integration**:
```typescript
import { kv } from '@vercel/kv';

class QueryCache {
  // Vercel KV for distributed caching
  private kv = kv;
  
  
  async get(query: string): Promise<SearchResult | null> {
    // Check Vercel KV cache
    const cached = await this.kv.get(query);
    if (cached) return cached as SearchResult;
    
    return null;
  }
  
  async set(query: string, result: SearchResult): Promise<void> {
    // Set with TTL based on result size (5-60 minutes)
    const ttl = this.calculateTTL(result);
    await this.kv.setex(query, ttl, result);
  }
}
```

## API Design

### Vercel Edge Function API

```typescript
// Edge Function for optimal performance
export const config = { runtime: 'edge' };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const type = searchParams.get('type');
  const filters = searchParams.get('filters');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const results = await searchEngine.search({
    query: q,
    type: type || 'fulltext',
    filters: parseFilters(filters),
    limit: limit
  });
  
  return Response.json(results);
}

// MCP Tool Integration
async function enhancedSearch(params: {
  query: string;
  fileTypes?: string[];
  tags?: string[];
  frontmatterFilters?: Record<string, any>;
  limit?: number;
}): Promise<SearchResult> {
  return searchEngine.search({
    query: params.query,
    type: 'smart', // Combines multiple search types
    filters: {
      fileTypes: params.fileTypes,
      tags: params.tags,
      frontmatter: params.frontmatterFilters
    },
    limit: params.limit || 10
  });
}
```

## Vercel-Specific Implementation

### Cron Job Indexing
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/index-repositories",
    "schedule": "0 */6 * * *" // Every 6 hours
  }]
}

// api/cron/index-repositories.ts
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Index or update repositories
  await indexer.updateAllRepositories();
  return new Response('OK');
}
```

### Vercel KV Usage Patterns
```typescript
// Efficient cache key design
const cacheKey = `search:${repoId}:${branch}:${queryHash}`;

// Batch operations for performance
await kv.mget(
  'search:query1',
  'search:query2',
  'search:query3'
);
```

## Performance Optimizations

### 1. Incremental Indexing
- Only re-index changed files on git push
- Use content hashes to detect actual changes
- Batch index operations for efficiency

### 2. Query Optimization
- Pre-compute common query patterns
- Use materialized views for complex aggregations
- Implement query result pagination

### 3. Resource Management
- Connection pooling for database
- Rate limiting for indexing operations
- Memory-bounded caches with LRU eviction

## Migration Strategy

### Phase 1: Vercel Infrastructure Setup
1. Create search tables in existing Vercel Postgres
2. Deploy Edge Functions for search API
3. Configure Vercel KV for caching

### Phase 2: Incremental Rollout
1. Index repositories via Vercel Cron Jobs
2. A/B test search performance
3. Monitor KV cache hit rates

### Phase 3: Full Migration
1. Replace all search operations
2. Optimize based on usage patterns
3. Remove legacy filesystem search code

## Monitoring & Analytics

```typescript
interface SearchMetrics {
  queryLatency: Histogram;
  indexLatency: Histogram;
  cacheHitRate: Gauge;
  indexSize: Gauge;
  queryVolume: Counter;
  errorRate: Counter;
}
```

## Security Considerations

1. **Access Control**: Respect GitHub repository permissions
2. **Rate Limiting**: Prevent search abuse
3. **Input Validation**: Sanitize search queries
4. **Data Isolation**: Separate indices per organization

## Infrastructure Costs

### Vercel-Native Approach
**Fixed Costs (Monthly):**
- Hobby Tier: $0 (supports ~30 active customers)
- Pro Tier: $20/month (supports ~150 active customers)
- Additional capacity: $0.30/100K KV requests

**Per-Customer Costs:**
- ~$0.04/month per active repository
- Marginal cost <1% of customer revenue

### Scaling Path
1. Start on Hobby tier (free)
2. Upgrade to Pro at ~30 customers
3. Add KV/Postgres resources as needed
4. Consider Enterprise tier at 500+ customers

## Consequences

### Benefits
- 95% reduction in search latency (90s → 2-5s)
- 93% reduction in token usage (44K → 2-3K)
- Zero additional infrastructure (uses existing Vercel stack)
- Global edge caching via Vercel network
- Automatic scaling with serverless architecture

### Tradeoffs
- PostgreSQL full-text search vs dedicated search engine
- KV storage limits in free/pro tiers
- Less advanced search features initially
- Vercel vendor lock-in

### Risks
- KV cache size limitations
- PostgreSQL search performance at scale
- Rate limits on free/pro tiers
- Potential need for Elasticsearch later

## Implementation Timeline

1. **Week 1-2**: Core indexer and storage setup
2. **Week 3-4**: Query engine and API implementation
3. **Week 5-6**: Webhook integration and real-time updates
4. **Week 7-8**: Caching layer and performance optimization
5. **Week 9-10**: Testing, monitoring, and gradual rollout

## Success Metrics

- Search latency P95 < 5 seconds
- Token usage reduction > 90%
- Cache hit rate > 80%
- Index freshness < 1 minute
- User satisfaction score > 4.5/5