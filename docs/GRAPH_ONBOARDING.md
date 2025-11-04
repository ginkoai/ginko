# Knowledge Graph Onboarding Guide

## Overview

The Ginko knowledge graph transforms your project documentation into an intelligent, queryable system. All processing happens in the cloud - no Neo4j setup, no model downloads, just instant intelligent search across your project knowledge.

**Key Benefits:**
- ☁️ **Zero setup** - No database installation required
- 🚀 **Instant processing** - Cloud GPUs handle embeddings in seconds
- 👥 **Team sharing** - Share knowledge graphs across your organization
- 🔒 **Private by default** - Your documents stay in your graph namespace
- 💾 **Auto-synced** - Changes sync automatically across team

## User Journey

### 1. Installation (One-time)

```bash
# Install Ginko CLI globally
npm install -g ginko

# Or use npx without installation
npx ginko graph init
```

### 2. Authentication (One-time)

```bash
# Authenticate with GitHub OAuth
ginko login
```

**What happens:**
- Opens browser for GitHub OAuth
- Authenticates with Ginko Cloud
- Stores session token locally
- Enables all cloud features (graph, team sharing, insights)

### 3. Initialize Your Project's Knowledge Graph

```bash
# Navigate to your project
cd /path/to/your/project

# Scan and initialize
ginko graph init
```

**What happens:**
- Scans for documents (ADRs, PRDs, patterns, sessions)
- Shows preview of what will be loaded
- Creates graph namespace for your project
- Creates `.ginko/graph/config.json` with settings

**Interactive prompts:**
```
🌿 Ginko Knowledge Graph Initialization
────────────────────────────────────

Scanning project...

Found documents in your project:
  📄 ADRs: 40 documents in docs/adr/
  📋 PRDs: 10 documents in docs/PRD/
  🎨 Patterns: 15 documents in .ginko/context/modules/
  ⚠️  Gotchas: 5 documents in .ginko/context/modules/
  📝 Sessions: 64 documents in .ginko/sessions/

Total: 137 documents (estimated processing time: 30-60 seconds)

────────────────────────────────────

✓ Authenticated as: chris@watchhill.ai
✓ Organization: Watchhill AI
✓ Cloud endpoint: api.ginko.ai

Ready to load documents to Ginko Cloud?

This will:
  • Upload documents to your private graph namespace
  • Generate embeddings using cloud GPUs
  • Create intelligent relationships
  • Enable semantic search

Proceed? (Y/n) Y
```

### 4. Loading Documents (Automatic after init)

After running `ginko graph init`, documents are automatically loaded. You can also manually trigger:

```bash
# Load all documents
ginko graph load

# Or load specific types
ginko graph load --docs-only      # Just ADRs and PRDs
ginko graph load --extended-only  # Patterns, gotchas, sessions
```

**What happens (all in the cloud):**
1. **Upload** (5-10 seconds)
   - Securely uploads documents to your private namespace
   - Compresses and batches for efficiency

2. **Processing** (20-40 seconds for 137 documents)
   - Parses markdown and extracts metadata
   - Generates 768-dim embeddings using cloud GPUs
   - Extracts explicit relationships (mentions, implements, etc.)
   - Computes semantic similarities
   - Creates all nodes and relationships

3. **Indexing** (5-10 seconds)
   - Creates vector indexes for fast search
   - Optimizes graph structure

**Progress output:**
```
🚀 Loading Knowledge Graph to Ginko Cloud
────────────────────────────────────

Uploading documents...
  ├─ Preparing 137 documents... ✓
  ├─ Compressing (2.4 MB → 180 KB)... ✓
  └─ Uploading to cloud... ✓ (8s)

Cloud processing...
  ├─ Parsing documents... ✓ (5s)
  ├─ Generating embeddings... ✓ (18s)
  ├─ Extracting relationships... ✓ (7s)
  └─ Building graph... ✓ (6s)

Finalizing...
  └─ Creating indexes... ✓ (4s)

────────────────────────────────────
✅ Knowledge graph ready!

📊 Summary:
  Nodes: 137 (6 types)
  Relationships: 298 (7 types)
  Namespace: /chris/ginko-project
  Visibility: Private (organization only)

🔍 Try these commands:
  ginko graph status           # View statistics
  ginko graph query "your ADR" # Semantic search
  ginko graph explore ADR-039  # Explore connections
  ginko graph share --team     # Share with team

🌐 View in browser: https://app.ginko.ai/graph/chris/ginko-project
```

### 5. Daily Usage

```bash
# Check graph health
ginko graph status

# Search semantically
ginko graph query "authentication patterns"
ginko graph query "cloud infrastructure decisions"

# Explore document connections
ginko graph explore ADR-039

# Update graph with new documents
ginko graph sync  # Incremental update

# Full rebuild (if needed)
ginko graph rebuild

# Share with team
ginko graph share --team
ginko graph share --public  # Make discoverable
```

## Cloud Architecture

Ginko uses a cloud-first architecture where all graph processing happens on Ginko's managed infrastructure:

### How It Works

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Your CLI   │ ──────> │  Ginko API   │ ──────> │   Neo4j AuraDS  │
│              │  HTTPS  │              │         │  (Multi-tenant) │
│ ginko graph  │         │ Processing:  │         │                │
│              │         │ • Embeddings │         │ Your namespace: │
│              │         │ • Relations  │         │ /org/project   │
│              │         │ • Search     │         │                │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Multi-Tenancy

Each organization/user gets a private namespace:
- **Namespace format**: `/org-id/project-id`
- **Isolation**: Your documents never mix with others
- **Sharing**: Opt-in team sharing within organization
- **Public graphs**: Opt-in for open-source projects

### Data Flow

1. **Upload**: Documents compressed and encrypted for upload
2. **Processing**: Cloud GPUs generate embeddings (faster than local)
3. **Storage**: Stored in your private Neo4j namespace
4. **Query**: All queries go through API with authentication

### Security

- 🔒 **TLS encryption** for all data in transit
- 🔐 **OAuth authentication** via GitHub
- 🏢 **Organization isolation** - can't query other orgs
- 🗑️ **Data deletion** - full control to delete your graphs
- 📜 **Audit logs** - track all access to your data

### Pricing

```
Free Tier:
  • 1000 documents
  • 100 queries/day
  • 1 project
  • Organization sharing

Pro ($29/month):
  • Unlimited documents
  • Unlimited queries
  • Unlimited projects
  • Advanced analytics
  • API access

Enterprise:
  • Self-hosted option
  • SSO integration
  • Compliance (SOC2, GDPR)
  • SLA guarantees
```

## CLI Commands Reference

### `ginko graph init`
Initialize knowledge graph in current project.

**Options:**
- `--quick` - Skip interactive prompts and use defaults
- `--skip-load` - Initialize config only, don't load documents yet
- `--private` - Keep graph private (default)
- `--team` - Share with organization automatically
- `--public` - Make graph publicly discoverable (for open-source)

**Example:**
```bash
# Quick init with team sharing
ginko graph init --quick --team

# Initialize without loading
ginko graph init --skip-load
```

### `ginko graph load`
Load all documents and create relationships.

**Options:**
- `--docs-only` - Load ADRs and PRDs only
- `--extended-only` - Load patterns, gotchas, sessions only
- `--force` - Reload even if already loaded
- `--no-embeddings` - Skip embedding generation
- `--no-relationships` - Skip relationship extraction

**Example:**
```bash
# Full load
ginko graph load

# Quick load without embeddings (faster)
ginko graph load --no-embeddings
```

### `ginko graph status`
Show graph statistics and health.

**Output:**
```
🌿 Knowledge Graph Status
────────────────────────────────────

Connection: ✓ Connected to bolt://localhost:7687

Documents:
  ADR: 40 nodes (40 with embeddings)
  PRD: 10 nodes (10 with embeddings)
  Pattern: 15 nodes (15 with embeddings)
  Gotcha: 5 nodes (5 with embeddings)
  Session: 64 nodes (64 with embeddings)
  ContextModule: 3 nodes (3 with embeddings)
  TOTAL: 137 nodes

Relationships:
  SIMILAR_TO: 278 (vector similarity)
  APPLIES_TO: 8 (patterns/modules apply to docs)
  REFERENCES: 5 (explicit mentions)
  IMPLEMENTS: 3 (ADRs implement PRDs)
  LEARNED_FROM: 2 (patterns from sessions)
  SUPERSEDES: 1 (ADR replaces another)
  MITIGATED_BY: 1 (gotcha mitigation)
  TOTAL: 298 relationships

Health: ✓ Healthy
Last sync: 2 hours ago
```

### `ginko graph query <text>`
Semantic search across all documents.

**Example:**
```bash
ginko graph query "authentication strategies"

# Output:
🔍 Semantic Search Results
────────────────────────────────────

1. [ADR-019] Claude Code SDK Agent Architecture (similarity: 0.89)
   "Architectural decision for implementing Claude Code SDK agents..."
   → View: ginko graph explore ADR-019

2. [PRD-005] User-Defined Reflectors SDK (similarity: 0.82)
   "Product requirements for user-defined reflection patterns..."
   → View: ginko graph explore PRD-005

3. [PATTERN-architecture-orchestrated-5-sonnet-agents] (similarity: 0.78)
   "Orchestrated Sonnet Agent Architecture for First-Use Experience..."
   → View: ginko graph explore PATTERN-architecture-orchestrated-5-sonnet-agents
```

### `ginko graph explore <documentId>`
Explore document and its connections.

**Example:**
```bash
ginko graph explore ADR-039

# Output:
📖 ADR-039: Knowledge Discovery Graph for AI-Native Development

Summary:
  Architectural decision to implement Neo4j knowledge graph with vector
  embeddings for intelligent context discovery in AI development workflows.

Tags: graph, neo4j, ai, knowledge, context, architecture

Relationships:
  Implements:
    → PRD-010: Cloud-First Knowledge Graph Platform

  Referenced by:
    ← ADR-040: Graph Query Optimization Strategies
    ← PRD-011: Advanced Graph Features

  Similar to:
    ↔ ADR-028: First-Use Experience Enhancement (similarity: 0.85)
    ↔ PATTERN-architecture-orchestrated-5-sonnet-agents (similarity: 0.82)

  Patterns applied:
    ← PATTERN-human-ai-collaboration-advantages

Connections: 9 total (7 outgoing, 2 incoming)
```

### `ginko graph sync`
Incrementally update graph with new/changed documents.

**What it does:**
- Scans for new/modified documents since last sync
- Updates nodes and regenerates embeddings
- Creates new relationships
- Much faster than full rebuild

**Example:**
```bash
# After adding new ADR
ginko graph sync

# Output:
🔄 Syncing Knowledge Graph
────────────────────────────────────

Scanning for changes...
  New documents: 2 (1 ADR, 1 Pattern)
  Modified documents: 1 (ADR-040)
  Deleted documents: 0

Processing changes... ✓ (8s)
Updating embeddings... ✓ (3s)
Creating relationships... ✓ (2s)

✅ Sync complete!
  Added: 2 nodes, 5 relationships
  Updated: 1 node, 2 relationships
```

### `ginko graph rebuild`
Full rebuild of knowledge graph.

**Warning:** Deletes all existing data and rebuilds from scratch.

**Options:**
- `--confirm` - Skip confirmation prompt

**Example:**
```bash
ginko graph rebuild --confirm
```

### `ginko graph config`
Manage graph configuration.

**Examples:**
```bash
# List all settings
ginko graph config --list

# Get specific setting
ginko graph config --get NEO4J_URI

# Set setting
ginko graph config --set NEO4J_URI="bolt://localhost:7687"

# Test connection
ginko graph ping
```

## Configuration File

Ginko creates `.ginko/graph/config.json`:

```json
{
  "version": "1.0",
  "neo4j": {
    "uri": "bolt://localhost:7687",
    "user": "neo4j",
    "useEnvPassword": true
  },
  "embedding": {
    "model": "all-mpnet-base-v2",
    "dimensions": 768,
    "provider": "local"
  },
  "documents": {
    "adr": {
      "enabled": true,
      "path": "docs/adr"
    },
    "prd": {
      "enabled": true,
      "path": "docs/PRD"
    },
    "patterns": {
      "enabled": true,
      "path": ".ginko/context/modules"
    },
    "sessions": {
      "enabled": true,
      "path": ".ginko/sessions"
    }
  },
  "relationships": {
    "similarityThreshold": 0.75,
    "extractExplicit": true,
    "inferSemantic": true
  },
  "lastSync": "2025-10-31T18:45:23Z"
}
```

## Team Workflows

### For Individual Developers

```bash
# One-time setup
ginko graph init --docker

# Daily workflow
git pull
ginko graph sync  # Update graph with team changes
ginko graph query "relevant topic"
```

### For Teams (Shared Neo4j)

```bash
# Team lead sets up Neo4j Aura instance
# Team members configure connection:

ginko graph config --set NEO4J_URI="neo4j+s://team.databases.neo4j.io"
ginko graph config --set NEO4J_USER="neo4j"
ginko graph config --set NEO4J_PASSWORD="team-password"

# Sync on pull
git pull && ginko graph sync
```

### CI/CD Integration

```yaml
# .github/workflows/graph-sync.yml
name: Sync Knowledge Graph

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - '.ginko/**'

jobs:
  sync-graph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Ginko
        run: npm install -g ginko

      - name: Sync Knowledge Graph
        env:
          NEO4J_URI: ${{ secrets.NEO4J_URI }}
          NEO4J_USER: ${{ secrets.NEO4J_USER }}
          NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
        run: ginko graph sync --confirm
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
ginko graph ping

# If fails, check:
1. Is Neo4j running? (docker ps or check Aura console)
2. Are credentials correct? (ginko graph config --list)
3. Is firewall blocking port 7687?

# Reset configuration
ginko graph config --reset
ginko graph init
```

### Performance Issues

```bash
# Check graph size
ginko graph status

# If > 1000 nodes, consider:
1. Reduce similarity threshold (fewer SIMILAR_TO relationships)
   ginko graph config --set relationships.similarityThreshold 0.80

2. Disable sessions (can be very numerous)
   ginko graph config --set documents.sessions.enabled false

3. Use incremental sync instead of rebuild
   ginko graph sync  # not rebuild
```

### Out of Sync

```bash
# If graph seems stale:
ginko graph sync --force

# If corrupted:
ginko graph rebuild --confirm
```

## Advanced Usage

### Custom Cypher Queries

```bash
# Run raw Cypher
ginko graph cypher "MATCH (n:ADR) RETURN n.id, n.title LIMIT 10"

# Save query results to file
ginko graph cypher "MATCH (n) RETURN n" --output graph-export.json
```

### Batch Operations

```bash
# Export entire graph
ginko graph export --format json > knowledge-graph.json

# Import graph
ginko graph import knowledge-graph.json
```

### Integration with Other Tools

```bash
# Generate diagram from graph
ginko graph diagram ADR-039 --format mermaid > architecture-diagram.md

# Export to GraphML for Gephi/Cytoscape
ginko graph export --format graphml > graph.graphml
```

## Next Steps

1. ✅ Load your knowledge graph: `ginko graph load`
2. 🔍 Try semantic search: `ginko graph query "your topic"`
3. 🌐 Explore in browser: http://localhost:7474
4. 📖 Read [Graph Query Guide](./GRAPH_QUERIES.md)
5. 🚀 Set up team sync workflow

## Resources

- [Neo4j Browser Guide](https://neo4j.com/docs/browser-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Vector Similarity Search](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
- [Ginko Graph Schema](./GRAPH_SCHEMA.md)
