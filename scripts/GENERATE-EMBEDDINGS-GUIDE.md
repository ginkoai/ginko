# Generate Embeddings Script - Usage Guide

**Script:** `scripts/generate-embeddings.ts`
**Purpose:** Batch process knowledge nodes to generate Voyage AI embeddings (ADR-045 Phase 2)
**Status:** Production Ready
**Last Updated:** 2025-11-07

---

## Overview

This script generates vector embeddings for all knowledge nodes in Neo4j that don't have embeddings yet. It uses **Voyage AI voyage-3.5** with 1024 dimensions for optimal balance of quality and performance.

### Key Features

- Batch processing with configurable batch size (default: 128)
- Checkpoint/resume capability (saves progress every 100 nodes)
- Quality gates (skips nodes with empty content)
- Error handling and retry logic
- Progress tracking with ETA
- Statistics reporting (processed, successful, failed, skipped)
- Command-line arguments for customization

---

## Prerequisites

### 1. Environment Variables

Create or update `.env` file in project root:

```bash
# Voyage AI Configuration
VOYAGE_API_KEY=pa-xxxxxxxxxxxxx  # Get from https://dash.voyageai.com

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### 2. Neo4j Vector Index

Ensure vector index exists before running:

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

### 3. Install Dependencies

```bash
npm install
```

---

## Usage

### Basic Usage

Process all nodes without embeddings:

```bash
npm run embeddings:generate
```

Or directly with npx:

```bash
npx tsx scripts/generate-embeddings.ts
```

### Advanced Options

#### Limit Number of Nodes (Testing)

Process only first 100 nodes:

```bash
npx tsx scripts/generate-embeddings.ts --limit 100
```

#### Custom Batch Size

Use smaller batch size (e.g., 64 instead of 128):

```bash
npx tsx scripts/generate-embeddings.ts --batch-size 64
```

#### Resume from Checkpoint

If script fails or is interrupted, resume from last checkpoint:

```bash
npx tsx scripts/generate-embeddings.ts --resume
```

#### Combined Options

```bash
npx tsx scripts/generate-embeddings.ts --batch-size 64 --limit 500 --resume
```

---

## How It Works

### Step-by-Step Process

1. **Environment Validation**
   - Checks for required environment variables
   - Validates Voyage API key and Neo4j credentials

2. **Neo4j Connection**
   - Connects to Neo4j database
   - Verifies connectivity

3. **Node Query**
   - Queries all nodes without embeddings
   - Filters by node types: ADR, PRD, Pattern, Gotcha, Session, CodeFile, ContextModule, KnowledgeNode
   - Shows distribution by type

4. **Quality Gates**
   - Skips nodes with no text content (title, content, summary, or description)
   - Logs skipped nodes for visibility

5. **Batch Processing**
   - Processes nodes in batches (default: 128)
   - Extracts text: `title + title + summary + description + content` (title weighted 2x)
   - Generates embeddings via Voyage AI with `input_type='document'`
   - Saves embeddings to Neo4j with metadata:
     - `embedding`: 1024-dimensional vector
     - `embedding_model`: 'voyage-3.5'
     - `embedding_dimensions`: 1024
     - `embedding_generated_at`: timestamp

6. **Checkpoint Saving**
   - Saves progress every 100 nodes to `.embeddings-checkpoint.json`
   - Automatically resumes from checkpoint on next run with `--resume`

7. **Error Handling**
   - Retries on rate limits (429 errors) with exponential backoff
   - Continues with next batch on transient errors
   - Saves checkpoint on fatal errors
   - Reports all errors in final summary

8. **Final Report**
   - Total nodes processed
   - Success/failure/skipped counts
   - Duration and processing rate
   - Error details (up to first 10)

---

## Output Examples

### Successful Run

```
============================================
  Batch Embedding Generation (ADR-045)
  Provider: Voyage AI voyage-3.5
  Dimensions: 1024
============================================

Configuration:
  Neo4j URI: bolt://localhost:7687
  Voyage API: https://api.voyageai.com/v1
  Batch Size: 128
  Limit: none
  Resume: no
  Checkpoint Interval: 100 nodes

Step 1: Connecting to Neo4j...
✓ Connected to Neo4j

Step 2: Querying nodes without embeddings...
✓ Found 450 nodes without embeddings

  Nodes by type:
    - ADR: 120
    - Pattern: 85
    - CodeFile: 95
    - Session: 80
    - KnowledgeNode: 70

Step 3: Generating embeddings...

  ✓ Progress: 128/450 (28%) | ✓ 128 ✗ 0 ⊘ 0 | ETA: 2m 15s
  ✓ Progress: 256/450 (57%) | ✓ 256 ✗ 0 ⊘ 0 | ETA: 1m 8s
  ✓ Progress: 384/450 (85%) | ✓ 384 ✗ 0 ⊘ 0 | ETA: 32s
  ✓ Progress: 450/450 (100%) | ✓ 445 ✗ 0 ⊘ 5 | ETA: 0s

============================================
✅ Batch embedding complete!
============================================

Summary:
  Total nodes: 450
  ✓ Successfully embedded: 445
  ✗ Failed: 0
  ⊘ Skipped (no content): 5
  ⏱  Duration: 2m 54s
  ⚡ Rate: 2.58 nodes/sec
```

### With Errors

```
Step 3: Generating embeddings...

  ✓ Progress: 128/450 (28%) | ✓ 128 ✗ 0 ⊘ 0 | ETA: 2m 15s
  ✗ Batch 128-256 failed: Rate limit exceeded. Retry after 60s
  ⏭  Continuing with next batch...

  ✓ Progress: 256/450 (57%) | ✓ 250 ✗ 6 ⊘ 0 | ETA: 1m 30s
...

Summary:
  Total nodes: 450
  ✓ Successfully embedded: 440
  ✗ Failed: 5
  ⊘ Skipped (no content): 5
  ⏱  Duration: 3m 45s
  ⚡ Rate: 2.00 nodes/sec

Failed nodes:
  - node_123: Rate limit exceeded
  - node_456: Rate limit exceeded
  - node_789: Rate limit exceeded
  ... and 2 more errors
```

---

## Checkpointing & Resume

### How Checkpointing Works

1. **Auto-save every 100 nodes**
   - Progress saved to `.embeddings-checkpoint.json` in project root
   - Contains: last processed index, statistics, errors

2. **Resume on failure**
   - Use `--resume` flag to continue from last checkpoint
   - Checkpoint automatically deleted on successful completion

3. **Manual cleanup**
   - Delete checkpoint file to start fresh: `rm .embeddings-checkpoint.json`

### Checkpoint File Format

```json
{
  "lastProcessedIndex": 256,
  "totalProcessed": 256,
  "successful": 250,
  "failed": 6,
  "skipped": 0,
  "timestamp": "2025-11-07T10:30:00.000Z",
  "errors": [
    {
      "nodeId": "node_123",
      "error": "Rate limit exceeded"
    }
  ]
}
```

---

## Performance & Rate Limits

### Voyage AI Rate Limits (Tier 1)

- **Requests per minute (RPM):** 2000
- **Tokens per minute (TPM):** 8,000,000

### Script Rate Limiting

- **Batch size:** 128 (recommended)
- **Delay between batches:** 100ms
- **Effective rate:** ~600 requests/minute (well under limit)

### Performance Targets

- **Processing rate:** 2-5 nodes/second (depends on content size)
- **450 nodes:** ~2-4 minutes
- **10,000 nodes:** ~40-80 minutes

### Free Tier Usage

- **Free tier:** 200M tokens
- **Average node:** ~800 tokens
- **Free tier capacity:** ~250,000 nodes
- **Estimated time to exhaust:** 119 months at 100-user scale

---

## Quality Gates

### Nodes Are Skipped If:

1. **No text content**
   - All fields (title, content, summary, description) are empty or null
   - Logged as: `⊘ Skipping {nodeId}: No text content`

2. **Already has embedding**
   - Node has `embedding` property set
   - Filtered out during query phase

### Text Extraction Strategy

**Weight formula:**
```
embedding_text = title + title + summary + description + content
```

**Why title appears twice:**
- Title is most semantically important
- 2x weight ensures title strongly influences embedding
- Improves search relevance for finding nodes by title

---

## Troubleshooting

### Error: "VOYAGE_API_KEY is required"

**Solution:** Set environment variable in `.env`:
```bash
VOYAGE_API_KEY=pa-xxxxxxxxxxxxx
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

### Error: "Rate limit exceeded"

**Causes:**
- Processing too fast (batch size too large)
- Multiple scripts running simultaneously
- Tier 1 rate limit reached (2000 RPM)

**Solution:**
1. Reduce batch size: `--batch-size 64`
2. Script will auto-retry with exponential backoff
3. Use `--resume` to continue after rate limit clears

### Script Hangs or Times Out

**Causes:**
- Very large nodes (>32K tokens)
- Network connectivity issues
- Neo4j transaction timeout

**Solution:**
1. Check node content sizes
2. Reduce batch size
3. Increase Neo4j timeout: `connectionAcquisitionTimeout: 60000`

### "Node not found in Neo4j"

**Causes:**
- Node deleted between query and update
- Graph ID mismatch
- Transaction conflict

**Solution:**
1. Re-run script (will skip deleted nodes)
2. Check for concurrent modifications to graph

---

## Integration with ADR-045

This script implements **ADR-045 Phase 2: Batch Processing Script**

### ADR-045 Compliance Checklist

- [x] Use VoyageEmbeddingClient.embedBatch()
- [x] Batch size: 128 (recommended)
- [x] input_type='document' for knowledge content
- [x] Save to Neo4j with metadata (model, dimensions, timestamp)
- [x] Progress tracking with console output
- [x] Checkpoint/resume capability (every 100 nodes)
- [x] Quality gates (skip empty content)
- [x] Error handling and retry logic
- [x] Command-line arguments (--batch-size, --limit, --resume)
- [x] Statistics (processed, successful, failed, ETA)

### Next Steps (ADR-045 Phase 3)

After embeddings are generated:

1. **Create semantic relationships** (SIMILAR_TO, RELATED_TO)
   - Run: `npm run graph:create-semantic-rels`
   - Uses similarity thresholds from `SIMILARITY_CONFIG`

2. **Implement semantic search endpoint**
   - Query embeddings with `db.index.vector.queryNodes()`
   - Return top-K most similar nodes

3. **Tune similarity thresholds**
   - Analyze distribution: P50, P75, P90, P95
   - Adjust thresholds in `config.ts` based on metrics

---

## Related Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `scripts/batch-embed-nodes.ts` | Legacy embedding script (all-mpnet) | Use for local testing with Xenova |
| `scripts/create-vector-indexes.ts` | Create Neo4j vector indexes | Run once before generating embeddings |
| `scripts/verify-embeddings.ts` | Verify embedding quality | After generation to check results |
| `scripts/analyze-relationship-quality.ts` | Analyze similarity relationships | After creating semantic relationships |

---

## FAQ

### Q: Can I run this on production data?

**A:** Yes, the script is production-safe. It only updates nodes without embeddings and doesn't modify existing embeddings.

### Q: What if I need to regenerate embeddings?

**A:** Set `embedding` property to `null` for nodes:
```cypher
MATCH (n:KnowledgeNode)
WHERE n.embedding IS NOT NULL
SET n.embedding = NULL
```

Then re-run the script.

### Q: Can I use voyage-3.5-lite instead of voyage-3.5?

**A:** Yes, modify `voyage-client.ts` to use `LITE_MODEL`. Trade-off: 50% cost savings, slightly lower quality.

### Q: How do I monitor token usage?

**A:** Check Voyage AI dashboard: https://dash.voyageai.com
Free tier: 200M tokens

### Q: Can I run multiple instances in parallel?

**A:** Not recommended. Rate limits are shared across instances. Use single instance with higher batch size instead.

---

## Support & Feedback

**Issues:** Report bugs or request features in project GitHub issues
**Documentation:** See `docs/adr/ADR-045-voyage-ai-embedding-provider.md`
**Team Contact:** Chris Norton (chris@watchhill.ai)

---

**Last Updated:** 2025-11-07
**Script Version:** 1.0.0
**ADR Reference:** ADR-045 Phase 2
