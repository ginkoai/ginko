# Quick Start: Batch Embedding

Run this to embed all nodes without embeddings.

## 1-Line Command

```bash
GINKO_GRAPH_ID=gin_xyz npm run graph:batch-embed
```

## Environment Setup

Create/edit `.env`:
```bash
GINKO_GRAPH_ID=gin_xyz
GINKO_GRAPH_API_URL=https://ginko-bjob1vkom-chris-nortons-projects.vercel.app
GINKO_GRAPH_TOKEN=test_token_12345
NEO4J_URI=bolt://your-server:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword
```

Then run:
```bash
npm run graph:batch-embed
```

## What Happens

1. Connects to your Neo4j graph via Graph API
2. Finds all nodes without embeddings
3. Generates 768-dimensional embeddings using all-mpnet-base-v2
4. Updates nodes with embedding vectors
5. Reports success/failure counts

## First Run

- Downloads ~420MB model (one-time)
- Takes 1-2 minutes total
- Model cached for future runs

## Subsequent Runs

- Uses cached model
- ~2 seconds per 100 nodes
- Skips already embedded nodes (idempotent)

## Verify Success

Check Neo4j:
```cypher
MATCH (n) WHERE n.embedding IS NOT NULL RETURN count(n)
```

## Need Help?

See full documentation: `scripts/BATCH-EMBED-NODES.md`
