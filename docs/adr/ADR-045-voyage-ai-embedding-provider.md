---
type: decision
status: proposed
updated: 2025-11-07
tags: [embeddings, vector-search, voyage-ai, semantic-search, infrastructure]
related: [ADR-039-graph-based-context-discovery.md, ADR-043-event-stream-session-model.md]
priority: high
audience: [developer, ai-agent, stakeholder]
estimated-read: 8-min
dependencies: [ADR-039]
---

# ADR-045: Voyage AI as Vector Embedding Provider

**Status:** Proposed
**Date:** 2025-11-07
**Authors:** Chris Norton, Claude (AI Assistant)
**Reviewers:** Chris Norton
**Related:** ADR-039 (Knowledge Discovery Graph), TASK-020.5 (Vector Embeddings Pipeline)

## Context

### The Need for Vector Embeddings

**TASK-020.5** (Vector Embeddings Pipeline) requires selecting an embedding provider to power semantic search across the knowledge graph. Use cases include:

1. **Semantic knowledge search** - Find conceptually similar nodes (docs, insights, code)
2. **Context-aware retrieval** - Load relevant documents based on current work
3. **Cross-project discovery** - Find patterns across different codebases
4. **Intelligent recommendations** - Suggest related knowledge during development

**Requirements:**
- **Performance**: <100ms query latency for semantic search
- **Quality**: High accuracy for code, documentation, and technical content
- **Cost**: Sustainable economics for freemium SaaS model
- **Scale**: Support 100-10,000 users without major infrastructure changes
- **Maintenance**: Minimal operational overhead

### The Landscape (January 2025)

**Commercial Options:**

| Provider | Model | Price/1M tokens | Dimensions | Performance |
|----------|-------|-----------------|------------|-------------|
| OpenAI | text-embedding-3-large | $0.13 | 3072 | Baseline |
| OpenAI | text-embedding-3-small | $0.02 | 1536 | Good |
| Voyage AI | voyage-3.5 | $0.06 | 2048 | **+9.74% vs OpenAI** |
| Voyage AI | voyage-3.5-lite | $0.02 | 1024 | Matches OpenAI small |
| Cohere | embed-english-v3.0 | $0.50 | 1024 | Expensive |

**Open Source Options:**

| Model | Dimensions | Hosting Cost | Performance |
|-------|------------|--------------|-------------|
| bge-en-icl (Hugging Face) | 1024 | ~$20-50/mo | Competitive |
| all-MiniLM-L6-v2 | 384 | Self-hosted | Lower quality |
| E5-mistral-7b-instruct | 4096 | $50-100/mo | High compute |

### Cost Analysis for Ginko

**Usage estimation (100 active users):**
- Distribution: 60 light (10 nodes/mo), 30 average (25 nodes/mo), 10 heavy (75 nodes/mo)
- Total nodes: ~2,100/month
- Average node size: ~800 tokens (mix of snippets to full documents)
- **Monthly volume**: ~1.68M tokens

**Monthly costs:**

| Provider | Cost at 100 users | Cost at 1K users | Cost at 10K users |
|----------|-------------------|------------------|-------------------|
| OpenAI (large) | $0.22 | $2.18 | $21.84 |
| OpenAI (small) | $0.03 | $0.34 | $3.36 |
| Voyage AI (3.5) | **$0.10** | **$1.01** | **$10.08** |
| Voyage AI (lite) | $0.03 | $0.34 | $3.36 |
| Cohere | $0.84 | $8.40 | $84.00 |
| Open Source | $0 API + hosting | $0 API + hosting | $0 API + hosting |

**Key insight**: Embedding costs are **negligible** even at scale. Not a cost bottleneck.

## Decision

**We will use Voyage AI voyage-3.5 as our primary embedding provider.**

### Rationale

**1. Superior Performance**
- Outperforms OpenAI text-embedding-3-large by **9.74%** on benchmarks
- Outperforms Cohere embed-english-v3.0 by **20.71%**
- Competitive with open-source bge-en-icl (94.55 vs 94.48 Recall@20)

**2. Generous Free Tier**
- **200M tokens free** = 119 months free at 100-user scale
- Reduces time-to-market risk (zero cost during MVP/beta)
- Allows extended testing before billing kicks in

**3. Cost Efficiency**
- 2.2x cheaper than OpenAI text-embedding-3-large ($0.06 vs $0.13)
- 1.6x cheaper than Cohere ($0.06 vs $0.50)
- Comparable to OpenAI small but with 2x dimensions (2048 vs 1536)

**4. Matryoshka Embeddings**
- Supports flexible dimensions: **256, 512, 1024, 2048**
- Allows optimization: store full 2048, query with 1024 for speed
- Future-proofs architecture for performance tuning

**5. Low Switching Cost**
- Standard REST API (similar to OpenAI)
- Easy to swap providers if needed (abstraction layer in SDK)
- Minimal vendor lock-in

**Why not Open Source?**

At current scale (100-10K users), commercial embeddings cost **$0.10-$10/month** - essentially free. Self-hosting adds:
- Infrastructure complexity ($20-50/mo minimum)
- Maintenance burden (model updates, monitoring)
- Deployment overhead (GPU/CPU optimization)

**Conclusion**: Premature optimization. Revisit at 10K+ users or if privacy requirements change.

## Implementation

### Phase 1: Server-Side Embedding Generation (TASK-020.5)

**API Integration:**

```typescript
// packages/shared/src/lib/embeddings/voyage-client.ts
import axios from 'axios';

interface VoyageEmbeddingRequest {
  input: string | string[];
  model: 'voyage-3.5' | 'voyage-3.5-lite';
  input_type: 'query' | 'document';
  output_dimension?: 256 | 512 | 1024 | 2048;
  truncation?: boolean;
}

export class VoyageEmbeddingClient {
  private apiKey: string;
  private baseURL = 'https://api.voyageai.com/v1';

  async embed(texts: string[], type: 'query' | 'document'): Promise<number[][]> {
    const response = await axios.post(
      `${this.baseURL}/embeddings`,
      {
        input: texts,
        model: 'voyage-3.5',
        input_type: type,  // CRITICAL: Must specify for retrieval
        output_dimension: 1024,  // Start with 1024, tune later
        truncation: true,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data.map((item: any) => item.embedding);
  }
}
```

**Environment Variables:**

```bash
# .env
VOYAGE_API_KEY=pa-xxxxxxxxxxxxx  # From https://dash.voyageai.com
```

**Neo4j Integration:**

```cypher
// Create vector index (1024 dimensions)
CREATE VECTOR INDEX knowledge_embeddings IF NOT EXISTS
FOR (n:KnowledgeNode)
ON n.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1024,
    `vector.similarity_function`: 'cosine'
  }
};
```

### Phase 2: Batch Processing Script

**Process existing knowledge nodes:**

```typescript
// scripts/generate-embeddings.ts
const batchSize = 128;  // Recommended batch size
const nodes = await getKnowledgeNodesWithoutEmbeddings();

for (let i = 0; i < nodes.length; i += batchSize) {
  const batch = nodes.slice(i, i + batchSize);
  const texts = batch.map(node => node.content);

  // Specify input_type="document" for knowledge content
  const embeddings = await voyageClient.embed(texts, 'document');

  await saveEmbeddingsToNeo4j(batch, embeddings);

  // Respect rate limits: 2000 RPM, 8M TPM
  await sleep(100);  // ~600 requests/min
}
```

### Phase 3: Semantic Search Endpoint

**GraphQL query with vector similarity:**

```typescript
// dashboard/src/app/api/v1/knowledge/search/route.ts
export async function POST(req: Request) {
  const { query, limit = 10 } = await req.json();

  // Generate query embedding
  const [queryEmbedding] = await voyageClient.embed([query], 'query');  // input_type="query"

  // Neo4j vector similarity search
  const results = await neo4j.run(`
    CALL db.index.vector.queryNodes(
      'knowledge_embeddings',
      $limit,
      $queryEmbedding
    )
    YIELD node, score
    RETURN node, score
    ORDER BY score DESC
  `, { queryEmbedding, limit });

  return NextResponse.json({ results });
}
```

### Phase 4: Similarity Relationship Tuning

**Problem**: Naive similarity matching creates over-connected graphs (1000+ relationships per node), resulting in noise and poor query performance.

**Root cause**: Using cosine similarity without thresholds creates relationships between every pair, even weakly similar ones (0.3-0.5 similarity).

#### Multi-Layer Filtering Strategy

**1. Top-K Limiting (Primary Defense)**

Only keep N most similar neighbors per node:

```cypher
-- BAD: Creates 1000+ relationships per node
CALL db.index.vector.queryNodes('knowledge_embeddings', 1000, $embedding)
YIELD node, score
MERGE (sourceNode)-[:SIMILAR_TO {score: score}]->(node)

-- GOOD: Only top 10 most similar
CALL db.index.vector.queryNodes('knowledge_embeddings', 10, $embedding)
YIELD node, score
WHERE score > 0.75
MERGE (sourceNode)-[:SIMILAR_TO {score: score}]->(node)
```

**Recommendation**: Start with **K=10** neighbors per node.

**2. Similarity Score Thresholds**

Empirical thresholds for technical content:

| Score Range | Quality | Use Case |
|-------------|---------|----------|
| 0.95-1.00 | Near-duplicate | Detect duplicates |
| 0.85-0.95 | Very similar | Strong conceptual match |
| 0.75-0.85 | Related | Good recommendation |
| 0.65-0.75 | Loosely related | Exploratory search |
| <0.65 | Noise | Discard |

```typescript
// packages/shared/src/lib/embeddings/similarity-matcher.ts
export class SimilarityMatcher {
  private readonly thresholds = {
    DUPLICATE: 0.95,
    HIGHLY_RELATED: 0.85,
    RELATED: 0.75,
    LOOSELY_RELATED: 0.65
  };

  async findSimilarNodes(
    embedding: number[],
    minScore = this.thresholds.RELATED,  // Default: 0.75
    limit = 10
  ): Promise<SimilarNode[]> {
    const results = await this.neo4j.run(`
      CALL db.index.vector.queryNodes(
        'knowledge_embeddings',
        $limit,
        $embedding
      )
      YIELD node, score
      WHERE score >= $minScore
      RETURN node, score
      ORDER BY score DESC
    `, { embedding, limit, minScore });

    return results.map(r => ({
      node: r.node,
      score: r.score,
      relationshipType: this.classifyRelationship(r.score)
    }));
  }

  private classifyRelationship(score: number): string {
    if (score >= this.thresholds.DUPLICATE) return 'DUPLICATE';
    if (score >= this.thresholds.HIGHLY_RELATED) return 'HIGHLY_RELATED';
    if (score >= this.thresholds.RELATED) return 'RELATED';
    return 'LOOSELY_RELATED';
  }
}
```

**3. Contextual Filtering**

Filter by project/tag scope before similarity search:

```cypher
CALL db.index.vector.queryNodes('knowledge_embeddings', 50, $embedding)
YIELD node, score
WHERE score > 0.75
  AND node.projectId = $projectId    -- Same project only
  AND node.status = 'active'         -- Exclude archived
  AND NOT node.id = $sourceNodeId    -- Exclude self
WITH node, score
ORDER BY score DESC
LIMIT 10
RETURN node, score
```

**4. Typed Relationships by Similarity Strength**

Create different relationship types based on score:

```cypher
MATCH (source:KnowledgeNode {id: $sourceId})
CALL db.index.vector.queryNodes('knowledge_embeddings', 20, source.embedding)
YIELD node, score
WHERE score > 0.75 AND NOT node.id = source.id
WITH source, node, score,
  CASE
    WHEN score >= 0.95 THEN 'DUPLICATE_OF'
    WHEN score >= 0.85 THEN 'HIGHLY_RELATED_TO'
    WHEN score >= 0.75 THEN 'RELATED_TO'
    ELSE null
  END AS relType
WHERE relType IS NOT NULL
CALL apoc.create.relationship(source, relType, {score: score, createdAt: datetime()}, node)
YIELD rel
RETURN count(rel) as relationshipsCreated
```

**5. Dynamic Threshold Tuning**

Analyze similarity distribution to set thresholds:

```typescript
// scripts/tune-similarity-thresholds.ts
async function analyzeSimilarityDistribution() {
  const samples = await getRandomKnowledgeNodes(100);
  const scores: number[] = [];

  for (const node of samples) {
    const neighbors = await findSimilarNodes(node.embedding, limit=50, minScore=0.0);
    scores.push(...neighbors.map(n => n.score));
  }

  const p50 = percentile(scores, 50);
  const p75 = percentile(scores, 75);
  const p90 = percentile(scores, 90);
  const p95 = percentile(scores, 95);

  console.log('Similarity Score Distribution:');
  console.log(`  P50 (median): ${p50.toFixed(3)}`);
  console.log(`  P75: ${p75.toFixed(3)}`);
  console.log(`  P90: ${p90.toFixed(3)}`);
  console.log(`  P95: ${p95.toFixed(3)}`);
  console.log(`\nRecommended threshold: ${p75.toFixed(3)} - ${p90.toFixed(3)}`);
}
```

**Tuning strategy**: Use **P75** (75th percentile) as minimum threshold. This keeps only top 25% of similarities.

**6. Quality Gates for Batch Processing**

```typescript
async function generateSimilarityRelationships() {
  const nodes = await getAllKnowledgeNodes();
  let totalCreated = 0;
  let skippedLowQuality = 0;

  for (const node of nodes) {
    const similar = await findSimilarNodes(node.embedding, minScore: 0.75, limit: 10);

    // Quality gate: Skip if average similarity is weak
    const avgScore = similar.reduce((sum, n) => sum + n.score, 0) / similar.length;
    if (avgScore < 0.80) {
      skippedLowQuality++;
      continue;
    }

    for (const match of similar) {
      await createSimilarityRelationship(node, match.node, match.score);
      totalCreated++;
    }
  }

  console.log(`Created ${totalCreated} relationships`);
  console.log(`Skipped ${skippedLowQuality} low-quality nodes`);
}
```

#### Recommended Configuration for TASK-020.5

```typescript
// packages/shared/src/lib/embeddings/config.ts
export const SIMILARITY_CONFIG = {
  // Conservative thresholds
  MIN_SCORE: 0.75,              // Only relationships above 75% similarity
  TOP_K: 10,                    // Max 10 neighbors per node
  SAME_PROJECT_ONLY: true,      // Don't compare across projects initially

  // Relationship type thresholds
  DUPLICATE_THRESHOLD: 0.95,
  HIGH_RELEVANCE_THRESHOLD: 0.85,
  MEDIUM_RELEVANCE_THRESHOLD: 0.75,

  // Quality gates
  MIN_AVG_SCORE: 0.80,          // Skip nodes with weak average similarity
};
```

#### Quality Metrics

Track these to validate tuning:

| Metric | Target | Meaning |
|--------|--------|---------|
| Relationships per node | 5-15 | Not too sparse, not too dense |
| Average similarity score | >0.80 | High-quality matches |
| P95 similarity score | >0.85 | Top matches are very relevant |
| User click-through rate | >30% | Users find recommendations useful |

#### Validation Query

After batch processing, check relationship distribution:

```cypher
// Check relationship statistics
MATCH ()-[r:SIMILAR_TO]->()
RETURN count(r) as total,
       avg(r.score) as avgScore,
       min(r.score) as minScore,
       max(r.score) as maxScore;

// Expected: 500-2000 total relationships (not 10,000+)
// Expected: avgScore > 0.80

// Check distribution per node
MATCH (n:KnowledgeNode)
OPTIONAL MATCH (n)-[r:SIMILAR_TO]->()
WITH n, count(r) as relCount
RETURN min(relCount) as minRels,
       avg(relCount) as avgRels,
       max(relCount) as maxRels,
       percentileCont(relCount, 0.95) as p95Rels;

// Expected: avgRels 5-15, maxRels <20
```

#### Tuning Checklist

- [ ] Set minimum score threshold (start at 0.75)
- [ ] Limit Top-K (max 10 neighbors per node)
- [ ] Add contextual filters (same project, active status)
- [ ] Use typed relationships (HIGHLY_RELATED, RELATED, LOOSELY_RELATED)
- [ ] Run distribution analysis (tune threshold to P75-P90)
- [ ] Add quality gates (skip nodes with avg similarity <0.80)
- [ ] Monitor metrics (relationships/node, avg score)
- [ ] Iterate based on feedback

**Expected outcome**: 500-2,000 high-quality relationships instead of 10,000+ noisy ones.

## Critical Gotchas & Mitigations

### 1. **input_type Parameter is Mandatory**

**Gotcha**: Voyage AI requires `input_type="query"` or `input_type="document"` for retrieval use cases. Omitting this or setting `null` degrades quality.

**Why**: Model is trained with contrastive learning - query embeddings optimized differently than document embeddings.

**Mitigation**:
```typescript
// ✅ CORRECT
await voyageClient.embed([userQuery], 'query');          // Searching
await voyageClient.embed([nodeContent], 'document');      // Indexing

// ❌ WRONG
await voyageClient.embed([userQuery], null);  // Degrades quality
```

### 2. **Batch Size Limits**

**Gotcha**: API supports up to 128 texts per request (recommended), 1000 max. Token limit: 320K for voyage-3.5.

**Mitigation**:
- Use `batchSize = 128` (not 1000)
- Chunk documents >32K tokens (max per text)
- Monitor token count before sending

### 3. **Rate Limits (Tier 1)**

**Gotcha**:
- **2000 RPM** (requests per minute)
- **8M TPM** (tokens per minute)
- Returns `429` error if exceeded

**Mitigation**:
```typescript
import pRetry from 'p-retry';

const embedWithRetry = pRetry(
  () => voyageClient.embed(texts, type),
  {
    retries: 3,
    factor: 2,  // Exponential backoff: 1s, 2s, 4s
    onFailedAttempt: (error) => {
      if (error.response?.status === 429) {
        console.log(`Rate limited, attempt ${error.attemptNumber}/3`);
      }
    }
  }
);
```

**Scaling**: Rate limits increase at Tier 2 (16M TPM) and Tier 3 (24M TPM) automatically as usage grows.

### 4. **Default Truncation Behavior**

**Gotcha**: `truncation=true` by default - silently cuts text >32K tokens without error.

**Mitigation**:
```typescript
// For critical content where truncation is unacceptable:
await voyageClient.embed(texts, 'document', { truncation: false });
// Raises error if text exceeds context length

// For user-generated content where truncation is acceptable:
await voyageClient.embed(texts, 'document', { truncation: true });
// Silently truncates, continues processing
```

### 5. **Credit Expiration**

**Gotcha**: Purchased credits expire after **1 year**, non-refundable.

**Mitigation**: Use free tier (200M tokens) as long as possible before purchasing credits. At 100-user scale, free tier lasts 119 months.

### 6. **Dimension Choices**

**Gotcha**: Higher dimensions (2048) = better quality but slower queries and more storage.

**Recommendation**: Start with **1024 dimensions**
- Balanced performance/quality
- 2x smaller than 2048 (less Neo4j storage)
- Easy to upgrade to 2048 if quality insufficient

**Future optimization**: Store 2048, query with 1024 using Matryoshka property (truncate embeddings at query time).

## Consequences

### Positive

1. **✅ 119 months free** at 100-user scale (200M token free tier)
2. **✅ Superior quality** (+9.74% vs OpenAI baseline)
3. **✅ Cost efficiency** (2.2x cheaper than OpenAI large)
4. **✅ Flexible dimensions** (256-2048) for future optimization
5. **✅ Simple integration** (REST API, similar to OpenAI)
6. **✅ Low risk** (easy to switch providers if needed)

### Negative

1. **⚠️ Vendor dependency** (but mitigated by abstraction layer)
2. **⚠️ Credit expiration** (1-year limit on purchased credits)
3. **⚠️ Rate limits** (2000 RPM at Tier 1, but auto-scales)

### Risks

1. **Voyage AI service disruption**
   - *Likelihood*: Low (venture-backed, MongoDB partnership)
   - *Mitigation*: Fallback to OpenAI in abstraction layer

2. **Pricing changes**
   - *Likelihood*: Medium (startup pricing flexibility)
   - *Mitigation*: Even 2x price increase still cheaper than alternatives

3. **Rate limit throttling**
   - *Likelihood*: Medium (during batch processing)
   - *Mitigation*: Exponential backoff retry, queue-based processing

### Alternatives Considered

**OpenAI text-embedding-3-large**
- ❌ 9.74% lower quality than Voyage AI
- ❌ 2.2x more expensive ($0.13 vs $0.06)
- ✅ Established provider, high reliability
- ✅ Simple integration

**OpenAI text-embedding-3-small**
- ❌ Lower quality (1536 dimensions)
- ✅ Same price as Voyage lite ($0.02)
- ❌ No free tier

**Cohere embed-english-v3.0**
- ❌ 20.71% lower quality than Voyage AI
- ❌ 8.3x more expensive ($0.50 vs $0.06)
- ❌ No compelling advantage

**Open Source (bge-en-icl, all-MiniLM-L6-v2)**
- ✅ $0 API costs
- ✅ Full data privacy
- ❌ Self-hosting complexity ($20-50/mo minimum)
- ❌ Maintenance burden (updates, monitoring)
- ❌ Premature optimization at 100-10K user scale

**Decision**: Voyage AI offers best risk/reward ratio for MVP/scale-up phase.

## Validation Plan

### Success Metrics (TASK-020.5)

1. **Semantic search quality**
   - Target: >80% relevance for top-5 results (manual evaluation)
   - Test queries: "authentication patterns", "context loading", "vector embeddings"

2. **Query latency**
   - Target: <100ms p95 (including Neo4j vector search)
   - Measure: Log search times in production

3. **Cost tracking**
   - Target: <$1/month for first 100 users (free tier)
   - Monitor: Voyage AI dashboard usage metrics

4. **Rate limit compliance**
   - Target: Zero 429 errors in production
   - Monitor: API error rates, implement exponential backoff

5. **Similarity relationship quality**
   - Target: 5-15 relationships per node (avg)
   - Target: Average similarity score >0.80
   - Target: Max relationships per node <20
   - Monitor: Neo4j relationship statistics, user feedback on recommendations

### Testing Checklist

**API Integration:**
- [ ] API key authentication works (VOYAGE_API_KEY)
- [ ] input_type parameter set correctly (query vs document)
- [ ] Batch processing respects 128-item limit
- [ ] Rate limit retry logic handles 429 errors
- [ ] Neo4j vector index created with correct dimensions

**Semantic Search Quality:**
- [ ] Semantic search returns relevant results
- [ ] Query latency <100ms p95
- [ ] Free tier usage tracked (<200M tokens)

**Similarity Relationship Quality:**
- [ ] Relationships per node: 5-15 (not 1000+)
- [ ] Average similarity score >0.80
- [ ] P95 similarity score >0.85
- [ ] Top-K limiting enforced (K=10)
- [ ] Score threshold enforced (min 0.75)
- [ ] Contextual filtering active (same project)
- [ ] Typed relationships created (HIGHLY_RELATED, RELATED)
- [ ] Quality gates prevent weak connections

## Related Work

- **ADR-039**: Knowledge Discovery Graph - defines semantic search requirements
- **ADR-043**: Event Stream Session Model - context loading depends on semantic retrieval
- **TASK-020.5**: Vector Embeddings Pipeline - implementation task
- **TASK-021**: Knowledge Node CRUD - creates nodes that need embeddings
- **TASK-024**: GraphQL API - exposes semantic search to clients

## References

- [Voyage AI Documentation](https://docs.voyageai.com/docs/embeddings)
- [Voyage AI Pricing](https://docs.voyageai.com/docs/pricing)
- [Voyage AI Rate Limits](https://docs.voyageai.com/docs/rate-limits)
- [Neo4j Vector Search](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
- [Voyage 3.5 Announcement](https://blog.voyageai.com/2025/05/20/voyage-3-5/)
- [Embedding Model Comparison (2025)](https://elephas.app/blog/best-embedding-models)

---

**Last Updated**: 2025-11-07
**Implementation Status**: Pending (TASK-020.5)
**Next Steps**: Implement VoyageEmbeddingClient and batch processing script
