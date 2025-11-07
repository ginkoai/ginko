# Generate Similarity Relationships Script - Usage Guide

**Script:** `scripts/generate-similarity-relationships.ts`
**Purpose:** Generate typed similarity relationships between knowledge nodes (ADR-045 Phase 4)
**Status:** Production Ready
**Last Updated:** 2025-11-07

---

## Overview

This script creates high-quality typed similarity relationships between knowledge nodes using Neo4j vector embeddings. It implements **ADR-045 Phase 4: Multi-Layer Filtering Strategy** to prevent over-connected graphs.

### Key Features

- Multi-layer filtering (Top-K limiting, score thresholds, contextual filters)
- Typed relationships (DUPLICATE_OF, HIGHLY_RELATED_TO, RELATED_TO, LOOSELY_RELATED_TO)
- Quality gates (skips nodes with avg similarity < 0.80)
- Checkpoint/resume capability (saves progress every 100 nodes)
- Progress tracking with ETA
- Validation metrics (rels/node, avg score, P95 score)
- Command-line arguments for customization
- Project-scoped processing (optional)

---

## Prerequisites

### 1. Environment Variables

Create or update `.env` file in project root:

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### 2. Knowledge Nodes with Embeddings

**REQUIRED:** Nodes must have embeddings before running this script.

If you haven't generated embeddings yet, run:
```bash
npx tsx scripts/generate-embeddings.ts
```

### 3. Neo4j Vector Index

Ensure vector index exists (created automatically during embedding generation):

```cypher
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

### 4. APOC Plugin

**REQUIRED:** Neo4j APOC plugin for dynamic relationship creation.

**Installation:**
- **Neo4j Desktop:** Enable APOC in Settings → Plugins
- **Docker:** Use `neo4j:latest` with APOC pre-installed
- **AuraDB:** APOC is pre-installed

### 5. Install Dependencies

```bash
npm install
```

---

## Usage

### Basic Usage

Generate relationships for all nodes with default settings (min score: 0.75, top-K: 10):

```bash
npm run similarity:generate
```

Or directly with npx:

```bash
npx tsx scripts/generate-similarity-relationships.ts
```

### Advanced Options

#### Custom Similarity Threshold

Only create relationships above 0.80 similarity:

```bash
npx tsx scripts/generate-similarity-relationships.ts --min-score 0.80
```

#### Custom Top-K Limit

Limit to 5 most similar neighbors per node:

```bash
npx tsx scripts/generate-similarity-relationships.ts --top-k 5
```

#### Project-Scoped Processing

Only process nodes from specific project:

```bash
npx tsx scripts/generate-similarity-relationships.ts --project-id my-project
```

#### Limit Number of Nodes (Testing)

Process only first 50 nodes:

```bash
npx tsx scripts/generate-similarity-relationships.ts --limit 50
```

#### Resume from Checkpoint

If script fails or is interrupted, resume from last checkpoint:

```bash
npx tsx scripts/generate-similarity-relationships.ts --resume
```

#### Combined Options

```bash
npx tsx scripts/generate-similarity-relationships.ts \
  --min-score 0.80 \
  --top-k 5 \
  --project-id ginko \
  --resume
```

---

## How It Works

### Step-by-Step Process

1. **Environment Validation**
   - Checks for required environment variables
   - Validates Neo4j credentials

2. **Neo4j Connection**
   - Connects to Neo4j database
   - Verifies connectivity

3. **Node Query**
   - Queries all KnowledgeNode nodes WITH embeddings
   - Filters by project (if `--project-id` specified)
   - Shows distribution by type

4. **Similarity Matching (Multi-Layer Filtering)**

   **Layer 1: Top-K Limiting**
   - Query vector index for top-K most similar nodes (default: 10)
   - Prevents over-connection by limiting neighbors per node

   **Layer 2: Score Thresholds**
   - Filter results by minimum similarity score (default: 0.75)
   - Only create relationships above threshold

   **Layer 3: Contextual Filtering**
   - Same project only (optional via config)
   - Active status only (excludes archived)
   - Exclude self (no self-loops)

   **Layer 4: Typed Relationships**
   - >= 0.95: DUPLICATE_OF (near-identical)
   - >= 0.85: HIGHLY_RELATED_TO (strong match)
   - >= 0.75: RELATED_TO (good recommendation)
   - >= 0.65: LOOSELY_RELATED_TO (exploratory)

   **Layer 5: Quality Gate**
   - Skip if average score < 0.80 (MIN_AVG_SCORE)
   - Prevents weak relationship clusters

5. **Relationship Creation**
   - Uses APOC to create dynamic relationship types
   - Stores relationship metadata:
     - `score`: Similarity score (0.0-1.0)
     - `createdAt`: Timestamp
     - `createdBy`: 'similarity-matcher'

6. **Checkpoint Saving**
   - Saves progress every 100 nodes to `.similarity-checkpoint.json`
   - Automatically resumes from checkpoint on next run with `--resume`

7. **Quality Validation**
   - Validates relationship distribution
   - Checks against targets from ADR-045:
     - 5-15 relationships per node (avg)
     - Average score > 0.80
     - P95 score > 0.85

8. **Final Report**
   - Total nodes processed
   - Relationships created
   - Success/failure/skipped counts
   - Quality metrics and validation results

---

## Output Examples

### Successful Run

```
============================================
  Typed Similarity Relationships (ADR-045)
  Phase 4: Multi-Layer Filtering
============================================

Configuration:
  Neo4j URI: bolt://localhost:7687
  Min Score: 0.75
  Top-K: 10
  Project ID: all projects
  Limit: none
  Resume: no
  Checkpoint Interval: 100 nodes

Step 1: Connecting to Neo4j...
✓ Connected to Neo4j

Step 2: Querying nodes with embeddings...
✓ Found 450 nodes with embeddings

  Nodes by type:
    - ADR: 120
    - Pattern: 85
    - CodeFile: 95
    - Session: 80
    - KnowledgeNode: 70

Step 3: Generating typed similarity relationships...

  ✓ Progress: 100/450 (22%) | ✓ 95 ✗ 0 ⊘ 5 | Rels: 820 (avg: 8.6) | ETA: 3m 15s
  ✓ Progress: 200/450 (44%) | ✓ 192 ✗ 0 ⊘ 8 | Rels: 1,650 (avg: 8.6) | ETA: 2m 5s
  ✓ Progress: 300/450 (67%) | ✓ 288 ✗ 0 ⊘ 12 | Rels: 2,475 (avg: 8.6) | ETA: 1m 10s
  ✓ Progress: 400/450 (89%) | ✓ 384 ✗ 0 ⊘ 16 | Rels: 3,300 (avg: 8.6) | ETA: 30s
  ✓ Progress: 450/450 (100%) | ✓ 432 ✗ 0 ⊘ 18 | Rels: 3,715 (avg: 8.6) | ETA: 0s

============================================
✅ Similarity relationship generation complete!
============================================

Summary:
  Total nodes: 450
  ✓ Successfully processed: 432
  ✗ Failed: 0
  ⊘ Skipped (quality gate): 18
  🔗 Relationships created: 3,715
  📊 Avg relationships/node: 8.60
  ⏱  Duration: 4m 15s
  ⚡ Rate: 1.76 nodes/sec

Step 4: Validating relationship quality...

Quality Metrics:
  Total relationships: 3,715
  Average score: 0.821
  Min score: 0.750
  Max score: 0.987

  By type:
    - DUPLICATE_OF: 12
    - HIGHLY_RELATED_TO: 340
    - RELATED_TO: 3,280
    - LOOSELY_RELATED_TO: 83

Quality Validation:
  Status: ✅ PASSED
  Avg relationships/node: 8.26
  Max relationships/node: 15
  Average score: 0.821
  P95 score: 0.892

Targets (from ADR-045):
  Relationships/node: 5-15
  Average score: >0.8
  P95 score: >0.85
```

### With Quality Gate Skips

```
Step 3: Generating typed similarity relationships...

  ✓ Progress: 50/450 (11%) | ✓ 42 ✗ 0 ⊘ 8 | Rels: 360 (avg: 8.6) | ETA: 4m 30s
  ⚠️  Skipping node node_123 - weak avg score: 0.742
  ✓ Progress: 100/450 (22%) | ✓ 88 ✗ 0 ⊘ 12 | Rels: 756 (avg: 8.6) | ETA: 3m 45s
  ...
```

### With Errors

```
Step 3: Generating typed similarity relationships...

  ✓ Progress: 128/450 (28%) | ✓ 120 ✗ 0 ⊘ 8 | Rels: 1,032 (avg: 8.6) | ETA: 3m 15s
  ✗ Node node_456 failed: Connection timeout
  ⏭  Continuing with next node...

  ✓ Progress: 256/450 (57%) | ✓ 245 ✗ 1 ⊘ 10 | Rels: 2,107 (avg: 8.6) | ETA: 1m 45s
  ...

Summary:
  Total nodes: 450
  ✓ Successfully processed: 430
  ✗ Failed: 2
  ⊘ Skipped (quality gate): 18
  🔗 Relationships created: 3,698
  📊 Avg relationships/node: 8.60
  ⏱  Duration: 4m 32s
  ⚡ Rate: 1.65 nodes/sec

Failed nodes:
  - node_456: Connection timeout
  - node_789: Transaction conflict
```

---

## Checkpointing & Resume

### How Checkpointing Works

1. **Auto-save every 100 nodes**
   - Progress saved to `.similarity-checkpoint.json` in project root
   - Contains: last processed index, statistics, errors, relationships created

2. **Resume on failure**
   - Use `--resume` flag to continue from last checkpoint
   - Checkpoint automatically deleted on successful completion

3. **Manual cleanup**
   - Delete checkpoint file to start fresh: `rm .similarity-checkpoint.json`

### Checkpoint File Format

```json
{
  "lastProcessedIndex": 256,
  "totalProcessed": 256,
  "successful": 245,
  "failed": 1,
  "skipped": 10,
  "relationshipsCreated": 2107,
  "timestamp": "2025-11-07T10:30:00.000Z",
  "errors": [
    {
      "nodeId": "node_456",
      "error": "Connection timeout"
    }
  ]
}
```

---

## Performance & Rate Limits

### Processing Rate

- **Processing rate:** 1-3 nodes/second (depends on graph size)
- **450 nodes:** ~3-7 minutes
- **10,000 nodes:** ~60-180 minutes

### Neo4j Query Performance

- **Vector search:** ~10-50ms per node (depends on index size)
- **Relationship creation:** ~5-20ms per batch (using APOC)
- **Total time:** Dominated by vector searches

### Performance Optimization

**If processing is slow:**

1. **Reduce Top-K:** Use `--top-k 5` instead of 10
2. **Increase min score:** Use `--min-score 0.80` to filter more aggressively
3. **Process by project:** Use `--project-id` to split work
4. **Check Neo4j memory:** Ensure adequate heap size for vector index

---

## Quality Gates

### Nodes Are Skipped If:

1. **No embedding**
   - Node doesn't have `embedding` property
   - Filtered out during query phase

2. **Weak average similarity** (Quality Gate)
   - Average similarity score < 0.80 (MIN_AVG_SCORE)
   - Prevents creation of low-quality relationship clusters
   - Logged as: `⚠️ Skipping {nodeId} - weak avg score: {score}`

3. **No similar nodes found**
   - No nodes meet minimum similarity threshold
   - No relationships to create

### Multi-Layer Filtering Strategy

**Why we need filtering:**

Naive approach creates **1000+ relationships per node** (over-connected graph).

**Our approach (ADR-045 Phase 4):**

```
Total candidates (before filtering): ~10,000 per node
│
├─ Layer 1: Top-K Limiting → 10 candidates
│  └─ Keep only 10 most similar neighbors
│
├─ Layer 2: Score Threshold → 7-10 candidates
│  └─ Filter by minScore >= 0.75
│
├─ Layer 3: Contextual Filters → 5-9 candidates
│  └─ Same project, active status, exclude self
│
├─ Layer 4: Typed Relationships → 5-9 typed rels
│  └─ Classify by strength (DUPLICATE_OF, HIGHLY_RELATED_TO, etc.)
│
└─ Layer 5: Quality Gate → 5-9 or 0
   └─ Skip if avgScore < 0.80

Result: 5-15 high-quality relationships per node
```

---

## Quality Metrics & Validation

### Target Metrics (ADR-045)

| Metric | Target | Meaning |
|--------|--------|---------|
| Relationships per node | 5-15 | Not too sparse, not too dense |
| Average similarity score | >0.80 | High-quality matches |
| P95 similarity score | >0.85 | Top matches are very relevant |
| Max relationships per node | ≤20 | Hard cap to prevent over-connection |

### Validation Queries

After script completes, validate manually:

```cypher
// Check relationship statistics
MATCH ()-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
RETURN count(r) as total,
       avg(r.score) as avgScore,
       min(r.score) as minScore,
       max(r.score) as maxScore;

// Expected: avgScore > 0.80

// Check distribution per node
MATCH (n:KnowledgeNode)
OPTIONAL MATCH (n)-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
WITH n, count(r) as relCount
RETURN min(relCount) as minRels,
       avg(relCount) as avgRels,
       max(relCount) as maxRels,
       percentileCont(relCount, 0.95) as p95Rels;

// Expected: avgRels 5-15, maxRels ≤20

// Check relationship type distribution
MATCH ()-[r]->()
WHERE type(r) IN ['DUPLICATE_OF', 'HIGHLY_RELATED_TO', 'RELATED_TO', 'LOOSELY_RELATED_TO']
RETURN type(r) as relType, count(r) as count
ORDER BY count DESC;

// Expected: RELATED_TO is most common, DUPLICATE_OF is rare
```

---

## Troubleshooting

### Error: "No nodes with embeddings found"

**Solution:** Generate embeddings first:
```bash
npx tsx scripts/generate-embeddings.ts
```

### Error: "Failed to connect to Neo4j"

**Causes:**
- Neo4j not running
- Wrong credentials
- Firewall blocking port 7687

**Solution:**
1. Start Neo4j: `neo4j start` or Docker container
2. Verify credentials in `.env`
3. Test connection: `npm run graph:check`

### Error: "APOC procedure not found"

**Causes:**
- APOC plugin not installed
- APOC not enabled in Neo4j config

**Solution:**
1. **Neo4j Desktop:** Enable APOC in Settings → Plugins
2. **Docker:** Use `neo4j:latest` image (includes APOC)
3. **AuraDB:** APOC is pre-installed
4. Restart Neo4j after installation

### Script Hangs or Times Out

**Causes:**
- Very large graph (>100K nodes)
- Neo4j out of memory
- Network connectivity issues

**Solution:**
1. Check Neo4j memory settings
2. Process by project: `--project-id`
3. Reduce Top-K: `--top-k 5`
4. Use `--limit` for testing

### "Weak avg score" Messages (Many Skips)

**Causes:**
- Embeddings are low quality
- Min score threshold too high
- Nodes are very different

**Solution:**
1. **Lower min score:** `--min-score 0.70`
2. **Regenerate embeddings:** Use voyage-3.5 instead of lite
3. **Check embedding quality:** Verify nodes have good content

### Quality Validation Failed

**Causes:**
- Relationships per node outside target range
- Average score below 0.80
- P95 score below 0.85

**Solution:**
1. **Too few relationships (<5):**
   - Lower `--min-score` to 0.70
   - Increase `--top-k` to 15

2. **Too many relationships (>15):**
   - Increase `--min-score` to 0.80
   - Decrease `--top-k` to 5

3. **Low average score (<0.80):**
   - Increase `--min-score` to 0.80
   - Quality gate will skip more nodes

4. **Low P95 score (<0.85):**
   - Increase `--min-score` to 0.80
   - Indicates top relationships are weak

---

## Tuning Thresholds

### Analyze Similarity Distribution

Before running, analyze your data to find optimal thresholds:

```typescript
// scripts/analyze-similarity-distribution.ts
const distribution = await matcher.analyzeSimilarityDistribution(100);

console.log('Similarity Score Distribution:');
console.log(`  P50 (median): ${distribution.p50.toFixed(3)}`);
console.log(`  P75: ${distribution.p75.toFixed(3)}`);
console.log(`  P90: ${distribution.p90.toFixed(3)}`);
console.log(`  P95: ${distribution.p95.toFixed(3)}`);
console.log(`  Recommended threshold: ${distribution.recommendedThreshold.toFixed(3)}`);
```

**Tuning strategy:**
- Use **P75** (75th percentile) as minimum threshold
- This keeps only top 25% of similarities
- Results in 5-15 relationships per node

### Recommended Configurations

**Conservative (fewer, higher-quality relationships):**
```bash
npx tsx scripts/generate-similarity-relationships.ts \
  --min-score 0.85 \
  --top-k 5
```

**Balanced (default - recommended):**
```bash
npx tsx scripts/generate-similarity-relationships.ts \
  --min-score 0.75 \
  --top-k 10
```

**Exploratory (more relationships, lower threshold):**
```bash
npx tsx scripts/generate-similarity-relationships.ts \
  --min-score 0.70 \
  --top-k 15
```

---

## Integration with ADR-045

This script implements **ADR-045 Phase 4: Similarity Relationship Tuning**

### ADR-045 Compliance Checklist

- [x] Use SimilarityMatcher class from shared package
- [x] Query KnowledgeNode nodes WITH embeddings
- [x] Apply multi-layer filtering (Top-K, score, contextual)
- [x] Create typed relationships (DUPLICATE_OF, HIGHLY_RELATED_TO, etc.)
- [x] Quality gate: skip if avgScore < 0.80
- [x] Progress tracking with console output
- [x] Checkpoint/resume capability (every 100 nodes)
- [x] Command-line arguments (--min-score, --top-k, --limit, --project-id, --resume)
- [x] Statistics (processed, successful, failed, skipped, relationships created)
- [x] Validation metrics (rels/node, avg score, P95 score)
- [x] Quality targets from ADR-045 (5-15 rels/node, >0.80 avg, >0.85 P95)

### ADR-045 Phase Sequence

**Phase 1: API Integration ✅**
- VoyageEmbeddingClient implementation
- Environment configuration

**Phase 2: Batch Processing ✅**
- `generate-embeddings.ts` script
- Embedding generation for all nodes

**Phase 3: Semantic Search Endpoint ⏳**
- GraphQL semantic search API
- Query embeddings with vector index

**Phase 4: Similarity Relationships ✅ (THIS SCRIPT)**
- Generate typed relationships
- Multi-layer filtering
- Quality validation

**Phase 5: Threshold Tuning ⏳**
- Analyze distribution
- Adjust thresholds based on metrics
- Monitor user feedback

---

## Related Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `scripts/generate-embeddings.ts` | Generate Voyage AI embeddings | **REQUIRED:** Run before this script |
| `scripts/analyze-similarity-distribution.ts` | Analyze score distribution | Before running to tune thresholds |
| `scripts/verify-relationship-quality.ts` | Verify relationship quality | After generation to check results |
| `scripts/clean-similarity-relationships.ts` | Delete all similarity relationships | To regenerate relationships |

---

## FAQ

### Q: Can I run this on production data?

**A:** Yes, the script is production-safe. It only creates new relationships and doesn't modify existing ones.

### Q: What if I need to regenerate relationships?

**A:** Delete existing similarity relationships:
```cypher
MATCH ()-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
DELETE r
```

Then re-run the script.

### Q: Can I run this multiple times?

**A:** Yes, but it will create duplicate relationships. Delete existing relationships first (see above).

### Q: How do I handle duplicate relationships?

**A:** Use MERGE instead of CREATE in relationship creation (requires code modification), or delete before regenerating.

### Q: Can I customize relationship types?

**A:** Yes, modify `SIMILARITY_CONFIG` thresholds in `packages/shared/src/lib/embeddings/config.ts`.

### Q: Can I run multiple instances in parallel?

**A:** Not recommended. Neo4j write conflicts may occur. Process different projects instead:
```bash
# Terminal 1
npx tsx scripts/generate-similarity-relationships.ts --project-id project-a

# Terminal 2
npx tsx scripts/generate-similarity-relationships.ts --project-id project-b
```

### Q: How do I monitor progress?

**A:** Check console output (updates after each node) or query Neo4j:
```cypher
MATCH ()-[r:DUPLICATE_OF|HIGHLY_RELATED_TO|RELATED_TO|LOOSELY_RELATED_TO]->()
RETURN count(r) as totalRelationships
```

---

## Support & Feedback

**Issues:** Report bugs or request features in project GitHub issues
**Documentation:** See `docs/adr/ADR-045-voyage-ai-embedding-provider.md`
**Team Contact:** Chris Norton (chris@watchhill.ai)

---

**Last Updated:** 2025-11-07
**Script Version:** 1.0.0
**ADR Reference:** ADR-045 Phase 4
