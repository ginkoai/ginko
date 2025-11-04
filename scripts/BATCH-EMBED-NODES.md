# Batch Node Embedding Script

**Location**: `/scripts/batch-embed-nodes.ts`

This script generates embeddings for all nodes in your Neo4j knowledge graph that don't already have them.

## Purpose

- Embeds all existing nodes without embeddings using `all-mpnet-base-v2` (768 dimensions)
- Connects via Cloud Graph API (not direct Neo4j connection)
- Handles errors gracefully and continues processing
- Provides progress tracking and detailed reporting
- **Idempotent**: Safe to run multiple times (skips already embedded nodes)

## Requirements

### Environment Variables

Set these in your `.env` file or export them before running:

```bash
# Required
GINKO_GRAPH_ID=your_graph_id_here    # Your graph namespace (e.g., "gin_abc123")

# Optional (defaults shown)
GINKO_GRAPH_API_URL=https://ginko-bjob1vkom-chris-nortons-projects.vercel.app
GINKO_GRAPH_TOKEN=test_token_12345

# Neo4j connection (used by Cloud Graph API)
NEO4J_URI=bolt://your-server:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword
```

### Node Types Embedded

The script embeds these node types:
- `ADR` - Architecture Decision Records
- `PRD` - Product Requirements Documents
- `Pattern` - Code patterns and best practices
- `Gotcha` - Common pitfalls and gotchas
- `Session` - Development session logs
- `CodeFile` - Source code files
- `ContextModule` - Context modules for AI

## Usage

### 1. Basic Usage

```bash
# Set your graph ID
export GINKO_GRAPH_ID=gin_xyz

# Run the script
tsx scripts/batch-embed-nodes.ts
```

### 2. With Custom Configuration

```bash
# Export all environment variables
export GINKO_GRAPH_ID=gin_abc123
export GINKO_GRAPH_API_URL=https://your-graph-api.vercel.app
export GINKO_GRAPH_TOKEN=your_token_here
export NEO4J_URI=bolt://your-neo4j-server:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=your_secure_password

# Run
tsx scripts/batch-embed-nodes.ts
```

### 3. One-Liner

```bash
GINKO_GRAPH_ID=gin_xyz tsx scripts/batch-embed-nodes.ts
```

## Output Example

```
============================================
  Batch Node Embedding Script
  Model: all-mpnet-base-v2 (768 dims)
============================================

Configuration:
  Graph API: https://ginko-bjob1vkom-chris-nortons-projects.vercel.app
  Graph ID: gin_xyz
  Token: test_token...

Step 1: Connecting to Cloud Graph API...
✓ Connected to graph

Step 2: Initializing embeddings model...
(First run will download ~420MB model - this may take a minute)
✓ Model loaded in 1234ms

Step 3: Querying nodes without embeddings...
✓ Found 89 nodes without embeddings

  Nodes by type:
    - ADR: 60
    - PRD: 29

Step 4: Generating embeddings...

  ✓ Embedded 10/89 nodes (11%)
  ✓ Embedded 20/89 nodes (22%)
  ✓ Embedded 30/89 nodes (34%)
  ...
  ✓ Embedded 89/89 nodes (100%)

============================================
✅ Batch embedding complete!
============================================

Summary:
  Total nodes processed: 89
  ✓ Successfully embedded: 89
```

## Error Handling

The script handles errors gracefully:

```
  ✗ Failed to embed adr_001: No text content available for embedding
```

Failed nodes are logged but processing continues. A summary is shown at the end:

```
Summary:
  Total nodes processed: 89
  ✓ Successfully embedded: 87
  ✗ Failed: 2

  Failed nodes:
    - adr_001: No text content available for embedding
    - pattern_xyz: Connection timeout
```

## Performance

- **First run**: ~1-2 minutes (includes model download ~420MB)
- **Subsequent runs**: ~2 seconds for 100 nodes
- **Memory usage**: ~1GB during processing
- **Progress updates**: Every 10 nodes

## Resume Capability

The script is **idempotent** - safe to run multiple times:

```bash
# First run - embeds 89 nodes
tsx scripts/batch-embed-nodes.ts

# Second run - finds 0 nodes (all already embedded)
tsx scripts/batch-embed-nodes.ts
```

Output when all nodes embedded:
```
✓ All nodes already have embeddings!

============================================
✅ No work needed - all nodes embedded
============================================
```

## Troubleshooting

### "GINKO_GRAPH_ID environment variable required"

**Solution**: Set your graph ID:
```bash
export GINKO_GRAPH_ID=gin_xyz
```

### "User does not have access to graph"

**Solution**: Verify your bearer token and graph ID are correct:
```bash
# Check graph exists
curl -H "Authorization: Bearer test_token_12345" \
  https://your-api/api/v1/graph/status?graphId=gin_xyz
```

### "Connection failed"

**Solution**: Verify Neo4j is accessible:
```bash
# Test connection
curl bolt://your-server:7687

# Or check environment
echo $NEO4J_URI
echo $NEO4J_USER
```

### Model download fails

**Solution**: Ensure you have ~500MB free disk space and internet connection. The model downloads to:
```bash
./.cache/transformers/
```

## Integration with Graph API

This script uses the **CloudGraphClient** which:
- Connects via Graph API endpoints (not direct Neo4j)
- Supports multi-tenant isolation (scoped by graphId)
- Requires Bearer token authentication
- Handles automatic query scoping to user's graph

## Next Steps

After running this script:

1. **Verify embeddings**: Check via Graph API status endpoint
2. **Test semantic search**: Use the embeddings for similarity queries
3. **Create similarity relationships**: Run the similarity extraction script

## Related Files

- **CloudGraphClient**: `api/v1/graph/_cloud-graph-client.ts`
- **EmbeddingsService**: `src/graph/embeddings-service.ts`
- **Documents API**: `api/v1/graph/documents.ts`
- **Vector Indexes Schema**: `schema/007-vector-indexes.cypher`

## Technical Details

### Text Combination Strategy

The script combines node properties for embedding:

```typescript
// Title weighted more heavily (appears twice)
const text = [
  node.title,
  node.title,      // Weight title
  node.summary,
  node.description,
  node.content
].filter(Boolean).join('\n\n');
```

### Update Query

Each node is updated with:
```cypher
MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(n {id: $nodeId})
SET n.embedding = $embedding,
    n.embedding_model = 'Xenova/all-mpnet-base-v2',
    n.embedding_dimensions = 768,
    n.embedding_generated_at = datetime()
```

### Batch Processing

- Processes nodes one at a time (not parallel)
- Reports progress every 10 nodes
- Continues on individual node failures
- Provides detailed error messages

---

**Created**: 2025-11-03
**Author**: Claude Code
**Related ADRs**: ADR-039 (Graph-based Context Discovery)
