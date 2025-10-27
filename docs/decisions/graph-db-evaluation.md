# Graph Database Evaluation for Ginko Cloud Platform

## Status
**In Progress** - Week 1 of SPRINT-2025-10-27

## Context

Evaluating graph database options for cloud-first knowledge graph platform (PRD-010). Need to select database that balances:
- Query performance (<50ms p95 for complex traversals)
- Cost efficiency (<$100/mo for 100 projects)
- Multi-tenancy support
- Developer experience
- Self-hosting capability

## Evaluation Criteria

### 1. Query Performance
- Simple queries (tag search, single node): <10ms p95
- Complex queries (graph traversal, 3-hop relationships): <50ms p95
- Full-text search: <100ms p95
- Batch operations (import 100 nodes): <1 second

### 2. Cost (Monthly, assuming 100 projects, 10K nodes)
- Managed service cost
- Self-hosted infrastructure cost (VPS)
- Storage costs
- Bandwidth/API call costs
- Total cost of ownership

### 3. Multi-Tenancy
- Data isolation per project
- Query performance with 100+ projects
- Row-level security / tenant filtering
- Scale to 1000+ projects

### 4. Developer Experience
- TypeScript/Node.js SDK quality
- Query language learning curve
- Error messages and debugging
- Documentation quality
- Community support

### 5. Scalability
- Horizontal scaling capability
- Write performance (inserts/updates)
- Maximum node/edge capacity
- Backup and replication

### 6. Self-Hosting
- Ease of deployment (Hetzner/DO/Linode)
- Resource requirements (RAM, CPU, storage)
- Maintenance burden
- Monitoring and observability

## Sample Knowledge Graph Dataset

To ensure fair comparison, all databases will be tested with identical dataset:

**100 Nodes:**
- 30 ADRs (Architecture Decision Records)
- 20 PRDs (Product Requirements Documents)
- 35 ContextModules (Patterns, gotchas, insights)
- 10 Sessions (Development session logs)
- 5 CodeFiles (Source file metadata)

**~200 Edges:**
- ADR -[IMPLEMENTS]-> PRD (25 edges)
- ADR -[REFERENCES]-> ADR (40 edges)
- Module -[RELATED_TO]-> ADR (50 edges)
- Session -[DISCOVERED_IN]-> Module (20 edges)
- Node -[TAGGED_WITH]-> Tag (65 edges)

**Properties:**
- Each node: id, type, title, status, content (1-5KB), tags (3-5 tags)
- Created/updated timestamps
- Metadata (author, relevance, etc.)

## Test Queries

All databases must implement these queries for benchmarking:

### Q1: Simple Tag Search
```
Find all nodes tagged with "authentication"
Expected: ~8 nodes
```

### Q2: Type Filter
```
Find all ADRs with status="accepted"
Expected: ~12 nodes
```

### Q3: Relationship Traversal (1-hop)
```
Find all modules related to ADR-038
Expected: ~5 modules
```

### Q4: Complex Graph Query (2-hop)
```
Find all PRDs implemented by ADRs that reference ADR-033
Expected: ~3 PRDs
```

### Q5: Full-Text Search
```
Search content for "JWT token refresh"
Expected: ~6 nodes (ADRs, modules, sessions)
```

### Q6: Implementation Status
```
For PRD-006, find:
- All implementing ADRs
- All related modules
- Implementation percentage (accepted ADRs / total)
Expected: 5 ADRs, 8 modules, 80% complete
```

---

## Option 1: PostgreSQL + Apache AGE

### Overview
- **Type**: Relational database with graph extension
- **Provider**: Existing Supabase PostgreSQL instance
- **Query Language**: Cypher (via AGE extension)
- **Open Source**: Yes (PostgreSQL License)

### Pros
- ✅ Leverage existing Supabase infrastructure (no new service)
- ✅ Familiar SQL + graph queries via AGE
- ✅ Zero additional cost (use existing Supabase plan)
- ✅ Built-in PostgreSQL features (JSONB, full-text search, RLS)
- ✅ Strong ACID guarantees
- ✅ Mature ecosystem

### Cons
- ❌ AGE extension less mature than dedicated graph DBs
- ❌ Graph query performance may be slower (not optimized)
- ❌ Cypher support incomplete (AGE is subset)
- ❌ Complex queries can be verbose in SQL
- ❌ Limited graph-specific optimizations

### Installation & Setup
```sql
-- Enable AGE extension on Supabase
CREATE EXTENSION IF NOT EXISTS age;

-- Load AGE into search path
SET search_path = ag_catalog, "$user", public;

-- Create graph
SELECT create_graph('ginko_knowledge');
```

### Sample Query (Cypher via AGE)
```sql
-- Find all ADRs implementing PRD-006
SELECT * FROM cypher('ginko_knowledge', $$
  MATCH (prd:PRD {id: 'PRD-006'})<-[:IMPLEMENTS]-(adr:ADR)
  RETURN adr.title, adr.status
$$) as (title agtype, status agtype);
```

### Cost Estimate
- **Current Supabase plan**: $25/mo (existing)
- **Additional cost**: $0 (use existing database)
- **Storage**: Included in Supabase plan
- **Total**: **$0 marginal cost**

### Benchmark Results
_To be filled after testing_

| Query | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Q1: Tag search | - | - | - |
| Q2: Type filter | - | - | - |
| Q3: 1-hop traversal | - | - | - |
| Q4: 2-hop traversal | - | - | - |
| Q5: Full-text search | - | - | - |
| Q6: Implementation status | - | - | - |

### Developer Experience
_To be filled after testing_

### Multi-Tenancy
_To be filled after testing_

### Recommendation
_To be filled after evaluation_

---

## Option 2: Neo4j (Self-Hosted)

### Overview
- **Type**: Native graph database
- **Provider**: Self-hosted on Hetzner/DO
- **Query Language**: Cypher (full support)
- **Open Source**: Community Edition (GPLv3)

### Pros
- ✅ Most mature graph database (20+ years)
- ✅ Full Cypher query language support
- ✅ Excellent graph query performance
- ✅ Rich ecosystem (tools, libraries, community)
- ✅ Graph-optimized storage and indexing
- ✅ Battle-tested at scale (LinkedIn, eBay, etc.)

### Cons
- ❌ Additional infrastructure to manage
- ❌ Ops overhead (monitoring, backups, updates)
- ❌ Higher resource requirements (RAM-heavy)
- ❌ Community edition lacks clustering (Enterprise only)
- ❌ Java-based (heap tuning complexity)

### Installation & Setup
```bash
# Docker deployment on Hetzner VPS
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  -v $HOME/neo4j/data:/data \
  neo4j:latest
```

### Sample Query (Cypher)
```cypher
// Find all ADRs implementing PRD-006
MATCH (prd:PRD {id: 'PRD-006'})<-[:IMPLEMENTS]-(adr:ADR)
RETURN adr.title, adr.status
```

### Cost Estimate
- **Hetzner CX31** (8GB RAM, 2 vCPU, 80GB SSD): €12/mo (~$13)
- **Backups** (Hetzner Volume 20GB): €2/mo
- **Bandwidth**: Included (20TB)
- **Total**: **~$15/mo**

### Benchmark Results
_To be filled after testing_

| Query | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Q1: Tag search | - | - | - |
| Q2: Type filter | - | - | - |
| Q3: 1-hop traversal | - | - | - |
| Q4: 2-hop traversal | - | - | - |
| Q5: Full-text search | - | - | - |
| Q6: Implementation status | - | - | - |

### Developer Experience
_To be filled after testing_

### Multi-Tenancy
_To be filled after testing_

### Recommendation
_To be filled after evaluation_

---

## Option 3: Neo4j AuraDB (Managed)

### Overview
- **Type**: Native graph database (managed service)
- **Provider**: Neo4j AuraDB
- **Query Language**: Cypher (full support)
- **Open Source**: No (proprietary managed service)

### Pros
- ✅ Fully managed (no ops overhead)
- ✅ Same query language as self-hosted Neo4j
- ✅ Automatic backups and updates
- ✅ Excellent performance
- ✅ Enterprise support available

### Cons
- ❌ Higher cost ($65-200/mo minimum)
- ❌ Vendor lock-in
- ❌ Less control over infrastructure
- ❌ Limited customization

### Cost Estimate
- **AuraDB Free**: 200K nodes, 400K relationships (limited)
- **AuraDB Professional**: $65/mo (1M nodes, 2M relationships)
- **Total**: **$65/mo** (minimum)

### Benchmark Results
_To be filled after testing (using free tier)_

| Query | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Q1: Tag search | - | - | - |
| Q2: Type filter | - | - | - |
| Q3: 1-hop traversal | - | - | - |
| Q4: 2-hop traversal | - | - | - |
| Q5: Full-text search | - | - | - |
| Q6: Implementation status | - | - | - |

### Recommendation
_To be filled after evaluation_

---

## Option 4: DGraph

### Overview
- **Type**: Native graph database (GraphQL-native)
- **Provider**: Self-hosted on Hetzner/DO
- **Query Language**: GraphQL (native), DQL (Dgraph Query Language)
- **Open Source**: Yes (Apache 2.0)

### Pros
- ✅ GraphQL-native (perfect fit for our API)
- ✅ Horizontally scalable (clustering built-in)
- ✅ Good multi-tenancy support
- ✅ Lower resource requirements than Neo4j
- ✅ Open source with commercial support available
- ✅ Modern, actively developed

### Cons
- ❌ Smaller community than Neo4j
- ❌ Less mature ecosystem
- ❌ Learning curve for DQL (if not using GraphQL)
- ❌ Fewer third-party integrations

### Installation & Setup
```bash
# Docker deployment
docker run -d \
  --name dgraph \
  -p 8080:8080 -p 9080:9080 \
  -v $HOME/dgraph:/dgraph \
  dgraph/standalone:latest
```

### Sample Query (GraphQL)
```graphql
query {
  queryPRD(filter: { id: { eq: "PRD-006" } }) {
    title
    implementedBy {
      title
      status
    }
  }
}
```

### Cost Estimate
- **Hetzner CX21** (4GB RAM, 2 vCPU, 40GB SSD): €6/mo (~$7)
- **Backups** (Hetzner Volume 10GB): €1/mo
- **Total**: **~$8/mo**

### Benchmark Results
_To be filled after testing_

| Query | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Q1: Tag search | - | - | - |
| Q2: Type filter | - | - | - |
| Q3: 1-hop traversal | - | - | - |
| Q4: 2-hop traversal | - | - | - |
| Q5: Full-text search | - | - | - |
| Q6: Implementation status | - | - | - |

### Developer Experience
_To be filled after testing_

### Multi-Tenancy
_To be filled after testing_

### Recommendation
_To be filled after evaluation_

---

## Option 5: EdgeDB

### Overview
- **Type**: Hybrid relational + graph database
- **Provider**: Self-hosted or EdgeDB Cloud
- **Query Language**: EdgeQL (modern, TypeScript-like)
- **Open Source**: Yes (Apache 2.0)

### Pros
- ✅ Modern, TypeScript-friendly syntax
- ✅ Built-in migrations and schema management
- ✅ Excellent TypeScript/Node.js SDK
- ✅ Combines relational + graph capabilities
- ✅ Strong type safety
- ✅ Built-in auth and access control

### Cons
- ❌ Very new (less battle-tested)
- ❌ Smaller community and ecosystem
- ❌ Fewer examples and tutorials
- ❌ Limited production case studies
- ❌ Learning curve for EdgeQL

### Installation & Setup
```bash
# Docker deployment
docker run -d \
  --name edgedb \
  -p 5656:5656 \
  -v $HOME/edgedb:/var/lib/edgedb/data \
  edgedb/edgedb:latest
```

### Sample Query (EdgeQL)
```edgeql
SELECT PRD {
  title,
  implementedBy: .<implements[IS ADR] {
    title,
    status
  }
}
FILTER .id = 'PRD-006'
```

### Cost Estimate
- **Hetzner CX21** (4GB RAM, 2 vCPU): €6/mo (~$7)
- **Backups**: €1/mo
- **Total**: **~$8/mo**

Alternatively:
- **EdgeDB Cloud**: $10-50/mo (managed)

### Benchmark Results
_To be filled after testing_

| Query | p50 | p95 | p99 |
|-------|-----|-----|-----|
| Q1: Tag search | - | - | - |
| Q2: Type filter | - | - | - |
| Q3: 1-hop traversal | - | - | - |
| Q4: 2-hop traversal | - | - | - |
| Q5: Full-text search | - | - | - |
| Q6: Implementation status | - | - | - |

### Developer Experience
_To be filled after testing_

### Multi-Tenancy
_To be filled after testing_

### Recommendation
_To be filled after evaluation_

---

## Comparison Matrix

### Cost Summary (100 projects, 10K nodes)

| Option | Setup Cost | Monthly Cost | Ops Overhead | Scalability |
|--------|------------|--------------|--------------|-------------|
| PostgreSQL + AGE | $0 | $0 (existing) | Low (managed) | Medium |
| Neo4j Self-Hosted | ~$100 | ~$15 | High (self-managed) | Medium |
| Neo4j AuraDB | $0 | $65+ | None (managed) | High |
| DGraph | ~$50 | ~$8 | Medium (self-managed) | High |
| EdgeDB | ~$50 | ~$8 | Medium (self-managed) | Medium |

### Performance Summary (to be filled)

| Option | Simple Query | Complex Query | Full-Text | Batch Import |
|--------|--------------|---------------|-----------|--------------|
| PostgreSQL + AGE | - | - | - | - |
| Neo4j Self-Hosted | - | - | - | - |
| Neo4j AuraDB | - | - | - | - |
| DGraph | - | - | - | - |
| EdgeDB | - | - | - | - |

### Developer Experience Summary (to be filled)

| Option | Query Language | TypeScript SDK | Learning Curve | Docs Quality |
|--------|----------------|----------------|----------------|--------------|
| PostgreSQL + AGE | SQL + Cypher | ⭐⭐⭐ | Medium | ⭐⭐⭐⭐ |
| Neo4j | Cypher | ⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ |
| DGraph | GraphQL/DQL | ⭐⭐⭐ | Medium | ⭐⭐⭐ |
| EdgeDB | EdgeQL | ⭐⭐⭐⭐⭐ | Medium | ⭐⭐⭐⭐ |

---

## Decision Framework

### Phase 1: Prototype & Benchmark (Days 1-3)
- [ ] Build prototype for each option
- [ ] Load sample dataset (100 nodes, 200 edges)
- [ ] Implement 6 test queries
- [ ] Run benchmarks (10 iterations each)
- [ ] Document performance results

### Phase 2: Developer Experience (Days 4-5)
- [ ] Evaluate TypeScript SDK quality
- [ ] Test error messages and debugging
- [ ] Assess documentation
- [ ] Rate learning curve

### Phase 3: Cost Analysis (Day 6)
- [ ] Project costs at 3 scales: 1K, 10K, 100K nodes
- [ ] Factor in ops overhead (time cost)
- [ ] Calculate total cost of ownership

### Phase 4: Decision (Day 7)
- [ ] Weighted scoring across criteria
- [ ] Document rationale
- [ ] Present recommendation
- [ ] Get stakeholder approval

### Scoring Weights
- **Performance**: 30% (critical path)
- **Cost**: 25% (business viability)
- **Developer Experience**: 20% (team velocity)
- **Multi-Tenancy**: 15% (architecture fit)
- **Scalability**: 10% (future-proofing)

---

## Final Decision

_To be completed after evaluation_

**Selected Database**: TBD

**Rationale**: TBD

**Next Steps**: TBD

---

**Status**: In Progress
**Updated**: 2025-10-27
**Owner**: Chris Norton & Claude
