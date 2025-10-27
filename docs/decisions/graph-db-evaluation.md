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
- **Provider**: Existing Supabase PostgreSQL instance (INCOMPATIBLE - see below)
- **Query Language**: Cypher (via AGE extension)
- **Open Source**: Yes (PostgreSQL License)
- **PostgreSQL Version**: Requires PostgreSQL 13 (AGE limitation)

### ⚠️ CRITICAL COMPATIBILITY ISSUE

**Apache AGE is NOT compatible with Supabase:**
- AGE only supports PostgreSQL 13
- Supabase uses PostgreSQL 15 (stable version)
- AGE is written in C (not a Trusted Language Extension)
- Cannot be installed on managed Supabase instances

**Workaround Options:**
1. Self-host PostgreSQL 13 with AGE (defeats "leverage existing infrastructure" benefit)
2. Use community Docker solution (auxcube/supabase-postgres-age)
3. Wait for AGE to support PostgreSQL 15+ (no timeline available)

**Impact**: This option is **effectively disqualified** unless we self-host PostgreSQL.

### Pros
- ✅ Familiar SQL + graph queries via AGE
- ✅ Built-in PostgreSQL features (JSONB, full-text search, RLS)
- ✅ Strong ACID guarantees
- ✅ Mature PostgreSQL ecosystem
- ✅ Open source (no vendor lock-in)

### Cons (Original + New Findings)
- ❌ **CRITICAL**: Incompatible with Supabase PostgreSQL 15
- ❌ **CRITICAL**: Requires self-hosting PostgreSQL 13
- ❌ AGE extension less mature than dedicated graph DBs
- ❌ No official performance benchmarks vs Neo4j (2024-2025)
- ❌ Sparse community compared to Neo4j
- ❌ Cypher support incomplete (AGE is subset)
- ❌ Complex queries can be verbose in SQL
- ❌ Limited graph-specific optimizations
- ❌ Would add infrastructure cost (self-hosted PostgreSQL)

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

**Original Assumption (INVALID due to incompatibility):**
- ~~Current Supabase plan: $25/mo (existing)~~
- ~~Additional cost: $0 (use existing database)~~

**Actual Cost (Self-Hosted PostgreSQL 13):**
- **Hetzner CX21** (4GB RAM, 2 vCPU, 40GB SSD): €6/mo (~$7)
- **Backups** (Hetzner Volume 10GB): €1/mo
- **Total**: **~$8/mo** (similar to other self-hosted options)

**Note**: Zero-cost advantage eliminated by incompatibility.

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

**Node.js Client**: `apache-age-client` npm package available
- Provides connection and Cypher query execution
- TypeScript support
- Example usage:
```javascript
import ApacheAgeClient from "apache-age-client";
const client = ApacheAgeClient.connect({
  database: "postgres", graph: "ginko",
  host: "localhost", port: 5432,
  user: "postgres", password: "..."
});
const result = await client.executeCypher(`MATCH (n) RETURN n`);
```

**Query Language**: Cypher (via AGE)
- Subset of Neo4j Cypher (not full compatibility)
- Learning curve moderate (similar to Neo4j)
- SQL knowledge helpful for hybrid queries

**Documentation**: Apache AGE documentation available but sparse
- Less comprehensive than Neo4j
- Smaller community (fewer Stack Overflow answers)
- Limited real-world examples

### Multi-Tenancy
_Would need testing, but PostgreSQL RLS could handle project isolation_

### Performance Research Findings

**No direct Apache AGE vs Neo4j benchmarks found for 2024-2025.**

Some indirect findings:
- One study showed 40x performance advantage for SQL recursive CTEs vs AGE graph traversals (specific use case)
- AGE loading: 725K nodes + 2.8M edges in 83 seconds (Azure PostgreSQL)
- No comprehensive graph query benchmarks published

**Conclusion**: Performance relative to native graph DBs is uncertain.

### Recommendation

**❌ DISQUALIFIED** - Critical compatibility blocker

**Rationale**:
1. **Incompatible with existing Supabase infrastructure** (main selling point invalid)
2. **Would require self-hosting PostgreSQL 13** (adds ops overhead)
3. **No cost advantage** ($8/mo same as DGraph/EdgeDB)
4. **Uncertain performance** (no benchmarks vs Neo4j)
5. **Less mature** than dedicated graph databases

**Verdict**: Skip prototyping. Focus evaluation on Neo4j, DGraph, EdgeDB.

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
- ❌ Higher resource requirements (RAM-heavy: 2-8GB minimum)
- ❌ Community Edition limitations:
  - Single-node only (no clustering)
  - No hot backups
  - No guaranteed support/fixes
  - Enterprise Edition required for HA/clustering
- ❌ Java-based (heap tuning complexity)
- ❌ Can be memory-intensive (users report 90% RAM usage on large DBs)

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

**Node.js Driver**: `neo4j-driver` npm package (official)
- **Excellent TypeScript support** (since v5.2.0)
- Type definitions for Node, Relationship with generics
- Requires Node.js 18+
- Example usage:
```typescript
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

const session = driver.session();
const result = await session.run(
  'MATCH (n:ADR) WHERE n.status = $status RETURN n',
  { status: 'accepted' }
);
await session.close();
```

**Query Language**: Cypher (full Neo4j implementation)
- Industry-standard graph query language
- Moderate learning curve (SQL-like syntax)
- Extensive documentation and examples
- GraphAcademy free courses (including TypeScript-specific)

**Documentation & Community**:
- ⭐⭐⭐⭐⭐ Excellent - Most comprehensive in graph DB space
- Large Stack Overflow community
- Active forums and Discord
- Official GraphAcademy learning platform
- Real-world production examples abundant

**Developer Tools**:
- Neo4j Browser (web-based query UI)
- Neo4j Desktop (development environment)
- Bloom (graph visualization)
- APOC procedures library (extended functions)

### Multi-Tenancy

**Approach**: Database-level isolation or label-based filtering

**Option 1: Multiple databases** (Neo4j 4.0+)
- Create separate database per project
- Strong isolation, but resource-intensive
- Example: `CREATE DATABASE project_abc`

**Option 2: Label/property filtering**
- Single database, filter by `projectId` property
- More efficient for many small projects
- Requires careful index management
- Example: `MATCH (n {projectId: 'abc'}) RETURN n`

**For MVP**: Label-based filtering sufficient (100 projects)
**For Scale**: Consider database-per-project or sharding

### Resource Requirements (Research)

**Minimum**:
- RAM: 2GB (512MB possible in Docker for small datasets)
- CPU: 1-2 vCPU
- Storage: Depends on data (rough estimate: 1-2x graph size)

**Recommended for MVP (100 projects, 10K nodes)**:
- RAM: 8GB (Neo4j is RAM-intensive)
- CPU: 2-4 vCPU
- Storage: 20-40GB SSD

**Sizing Tool**: Neo4j provides hardware sizing calculator

### Recommendation
_To be filled after prototyping and benchmarking_

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

**AuraDB Free Tier**:
- **Limits**: 50K nodes, 175K relationships (conflicting reports: some sources say 200K nodes)
- **Features**: Fully managed, 24/7 availability, no time limit
- **Limitations**: Suitable for prototyping/learning only
- **Cost**: **$0**

**AuraDB Professional**:
- **Starting**: $65/mo (8GB RAM minimum)
- **Example**: 4GB RAM instance = $259/mo
- **Features**: Enhanced performance, best-effort support, production-ready
- **Pay-as-you-go** pricing model available

**For MVP (100 projects, 10K nodes)**: Free tier too small, Professional required
**Cost**: **$65/mo minimum**

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
- ✅ GraphQL-native (perfect fit for our GraphQL API)
- ✅ Auto-generates queries/mutations from schema
- ✅ Horizontally scalable (clustering built-in)
- ✅ Open source (Apache 2.0)
- ✅ Modern, actively developed
- ✅ Schema-first design (just define schema, Dgraph handles CRUD)

### Cons
- ❌ **CRITICAL**: Multi-tenancy is enterprise feature (not open source!)
- ❌ **CRITICAL**: High resource requirements (recommended: 16 vCPU, 32GB RAM)
- ❌ Smaller community than Neo4j
- ❌ Less mature ecosystem
- ❌ Vendor benchmarks questionable (2017, disputed by Neo4j)
- ❌ Fewer third-party integrations
- ❌ Learning curve for DQL if GraphQL insufficient

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

**Recommended Configuration** (from Dgraph docs):
- 16 vCPU, 32 GiB RAM per machine
- 250-750 GB storage (Alpha nodes)
- For HA: 3 nodes minimum

**Realistic MVP Configuration** (scaled down):
- **Hetzner CPX31** (4 vCPU, 8GB RAM, 160GB SSD): €16/mo (~$17)
- **Backups** (Hetzner Volume 20GB): €2/mo
- **Total**: **~$19/mo**

**Note**: Official recommendations are overkill for MVP. Testing needed to determine minimum viable specs.

**Enterprise Multi-Tenancy**: Requires paid license (cost unknown)

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

**Node.js Client**: `dgraph-js` npm package (official)
- gRPC and HTTP implementations available
- TypeScript type definitions included
- Example usage:
```typescript
import { DgraphClient, DgraphClientStub } from "dgraph-js";
import * as grpc from "@grpc/grpc-js";

const clientStub = new DgraphClientStub("localhost:9080", grpc.credentials.createInsecure());
const dgraphClient = new DgraphClient(clientStub);

const query = `{
  queryADR(filter: { status: { eq: "accepted" } }) {
    title status
  }
}`;

const response = await dgraphClient.newTxn().query(query);
```

**Query Language**: GraphQL (native) + DQL (Dgraph Query Language)
- **GraphQL**: Auto-generated from schema - just define types
- **Schema-first**: Define schema, get full CRUD API automatically
- **Auto-generated operations**: GET, QUERY, ADD, UPDATE, DELETE for each type
- **Deep mutations**: Nested create/update operations
- Moderate learning curve (GraphQL is familiar)

**Schema Example**:
```graphql
type ADR {
  id: ID!
  number: Int! @search
  title: String! @search(by: [fulltext])
  status: String! @search
  content: String
  implementsPRD: [PRD] @hasInverse(field: implementedBy)
}
```

**Documentation & Community**:
- ⭐⭐⭐ Good - Comprehensive GraphQL docs
- Smaller community than Neo4j
- Active Discuss forum
- Official blog and tutorials
- Fewer Stack Overflow answers

### Multi-Tenancy

⚠️ **CRITICAL LIMITATION**: Multi-tenancy is an **Enterprise Feature**

**Enterprise Multi-Tenancy**:
- Built on Access Control Lists (ACL)
- Namespace-based isolation per tenant
- **Data-level isolation** (shared compute resources)
- Requires paid Enterprise license

**Open Source Workarounds**:
1. **Property-based filtering**: Add `projectId` to all nodes
   - Requires manual filtering in every query
   - Risk of developer error (forgetting filter)
   - Not true isolation

2. **Multiple Dgraph instances**: One cluster per project
   - Resource-intensive (16 vCPU × N projects)
   - Cost prohibitive

**For MVP**: Property-based filtering (risky) or pay for Enterprise (cost unknown)

### Performance Claims (Vendor Benchmarks - 2017)

Dgraph published benchmarks vs Neo4j claiming:
- 3x faster for reads/writes
- 160x faster for data loading
- 5x less memory usage

**Caveats**:
- 2017 benchmarks (outdated)
- Vendor-provided (not independent)
- Neo4j disputed methodology
- No recent independent comparisons available

### Recommendation

⚠️ **LIKELY DISQUALIFIED** - Multi-tenancy blocker

**Rationale**:
1. **Multi-tenancy is Enterprise-only** (paid license, cost unknown)
2. **Open source workarounds are risky** (property filtering error-prone)
3. **High resource requirements** (16 vCPU official recommendation)
4. **GraphQL-native is attractive**, but not worth the limitations

**Verdict**: Unless multi-tenancy becomes open source or we can afford Enterprise license, this option is not viable for multi-tenant SaaS MVP.

**Update**: Check if recent versions open-sourced multi-tenancy before final decision.

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

**Self-Hosted Configuration**:
- **Hetzner CX21** (4GB RAM, 2 vCPU): €6/mo (~$7)
- **Backups**: €1/mo
- **Total**: **~$8/mo**

**Minimum Requirements**: 1GB RAM, 1 vCPU (EdgeDB runs lighter than Neo4j/DGraph)

**EdgeDB Cloud (Now "Gel")** - Managed:
- **Free Tier**: 1/4 compute unit, 1GB storage (suitable for testing, not production)
- **Paid Tier**: Starting $39/mo (1 compute unit, 10GB storage)
- **Cost Scaling**: ~$50-150/mo for production workloads

**Note**: Self-hosting significantly cheaper than managed cloud for MVP phase.

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

**Node.js Client**: `edgedb` npm package (official)
- **Excellent TypeScript support** (first-class TypeScript integration)
- Query builder with type inference from schema
- EdgeQL: Modern syntax inspired by TypeScript/GraphQL
- Requires Node.js 18+

**Example Usage**:
```typescript
import { createClient } from "edgedb";

const client = createClient();

// Type-safe query with auto-completion
const result = await client.query(`
  SELECT PRD {
    title,
    implementedBy := .<implements[IS ADR] {
      title,
      status
    }
  }
  FILTER .id = <str>$prdId
`, { prdId: "PRD-006" });
```

**Documentation & Community**:
- ⭐⭐⭐⭐ Very Good - Modern, comprehensive documentation
- Interactive tutorial and examples
- Smaller community than Neo4j
- Active Discord community
- Growing ecosystem (still maturing)

**EdgeQL Learning Curve**:
- Syntax similar to TypeScript/SQL hybrid
- Composable queries (build complex queries from simple ones)
- Strong type system (catches errors at compile time)
- Learning curve moderate (new syntax to learn, but logical)

### Multi-Tenancy

✅ **Built-in Support** via property-based tenant isolation

**Implementation Approach**:
1. **Tenant ID Pattern**: Add `project_id` property to all node types
2. **Access Control**: EdgeDB built-in access policies enforce tenant filtering
3. **Automatic Filtering**: Policies apply tenant filter to all queries automatically
4. **Data Isolation**: Each project's data logically isolated at query level

**Example Schema with Multi-Tenancy**:
```edgeql
type PRD {
  required property project_id -> uuid;
  required property title -> str;

  # Access policy enforces tenant isolation
  access policy project_isolation
    allow all using (.project_id = global current_project_id);
}
```

**Security Model**:
- Set `current_project_id` global variable per authenticated session
- EdgeDB enforces access policies automatically
- No manual filtering required in application code
- Reduces risk of cross-tenant data leaks

**Comparison to Alternatives**:
- **Better than**: Property-based filtering in DGraph (EdgeDB enforces at DB level)
- **Similar to**: Neo4j label-based filtering (but more type-safe)
- **Not as isolated as**: Separate databases per tenant (but acceptable for MVP)

**For MVP**: ✅ Sufficient - Built-in policies provide good tenant isolation with low complexity

### Recommendation

✅ **STRONG CANDIDATE** - Modern, TypeScript-friendly, cost-effective

**Strengths**:
1. **Excellent TypeScript DX** - First-class type safety and modern SDK
2. **Built-in Multi-Tenancy** - Access policies enforce tenant isolation at DB level
3. **Lowest Cost** - ~$8/mo self-hosted (lighter resource requirements)
4. **Modern Architecture** - Built on PostgreSQL, combines relational + graph
5. **Schema Management** - Built-in migrations and strong type system
6. **Active Development** - Regular updates, responsive maintainers

**Concerns**:
1. **Less Battle-Tested** - Newer technology (EdgeDB 1.0 released 2022)
2. **Smaller Community** - Fewer Stack Overflow answers and examples
3. **Learning Curve** - EdgeQL is new query language (though well-designed)
4. **Production Case Studies** - Limited public references compared to Neo4j

**Best Fit For**:
- Teams prioritizing TypeScript/Node.js developer experience
- Cost-conscious MVPs with uncertain scale
- Projects valuing modern tooling and strong type safety
- Teams willing to learn new query language

**Trade-off vs Neo4j**:
- EdgeDB: Better DX, lower cost, less proven at scale
- Neo4j: More mature, larger community, battle-tested

**Verdict**: Compelling modern alternative to Neo4j. If team is comfortable with newer technology and values TypeScript DX, EdgeDB offers significant advantages. Recommend prototyping alongside Neo4j before final decision.

---

## Comparison Matrix

### Cost Summary (100 projects, 10K nodes)

| Option | Setup Cost | Monthly Cost | Ops Overhead | Scalability | Status |
|--------|------------|--------------|--------------|-------------|--------|
| PostgreSQL + AGE | $0 | $0 (existing) | Low (managed) | Medium | ❌ DISQUALIFIED (incompatible) |
| Neo4j Self-Hosted | ~$100 | ~$15 | High (self-managed) | Medium | ✅ **SELECTED** |
| Neo4j AuraDB | $0 | $65+ | None (managed) | High | ⚠️ Too expensive for MVP |
| DGraph | ~$50 | ~$19 | Medium (self-managed) | High | ❌ DISQUALIFIED (multi-tenancy) |
| EdgeDB | ~$50 | ~$8 | Medium (self-managed) | Medium | ⚠️ Finalist (not selected) |

### Performance Summary (to be filled)

| Option | Simple Query | Complex Query | Full-Text | Batch Import |
|--------|--------------|---------------|-----------|--------------|
| PostgreSQL + AGE | - | - | - | - |
| Neo4j Self-Hosted | - | - | - | - |
| Neo4j AuraDB | - | - | - | - |
| DGraph | - | - | - | - |
| EdgeDB | - | - | - | - |

### Developer Experience Summary

| Option | Query Language | TypeScript SDK | Learning Curve | Docs Quality | Community |
|--------|----------------|----------------|----------------|--------------|-----------|
| PostgreSQL + AGE | SQL + Cypher | ⭐⭐⭐ | Medium | ⭐⭐⭐⭐ | ❌ N/A (incompatible) |
| Neo4j | Cypher | ⭐⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ Excellent |
| DGraph | GraphQL/DQL | ⭐⭐⭐ | Medium | ⭐⭐⭐ | ⭐⭐⭐ Good |
| EdgeDB | EdgeQL | ⭐⭐⭐⭐⭐ | Medium | ⭐⭐⭐⭐ | ⭐⭐⭐ Growing |

**Key Insights**:
- **Neo4j**: Best documentation and largest community, proven at scale
- **EdgeDB**: Best TypeScript integration, modern DX, smaller community
- **DGraph**: GraphQL-native attractive, but multi-tenancy blocker disqualifies

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

### Research Phase Complete ✅

After comprehensive research of 5 database options, we've narrowed the field to **2 strong candidates**:

### 🥇 Finalist #1: Neo4j (Self-Hosted Community Edition)

**Why Neo4j**:
- ✅ **Battle-tested at scale** - Proven in production at major companies
- ✅ **Excellent documentation** - GraphAcademy, large Stack Overflow community
- ✅ **Mature multi-tenancy** - Label-based filtering well-documented
- ✅ **Low learning curve** - Cypher query language intuitive
- ✅ **Strong TypeScript support** - Official neo4j-driver with v5.2+ types

**Trade-offs**:
- ⚠️ Higher cost (~$15/mo vs ~$8/mo)
- ⚠️ Higher resource requirements (8GB RAM recommended)
- ⚠️ Self-hosting operational overhead

**Best if**: Team prioritizes **proven reliability** and **community support** over cutting-edge DX

---

### 🥇 Finalist #2: EdgeDB (Self-Hosted)

**Why EdgeDB**:
- ✅ **Outstanding TypeScript DX** - First-class type safety, modern tooling
- ✅ **Lowest cost** (~$8/mo, 1GB RAM minimum)
- ✅ **Built-in multi-tenancy** - Access policies enforce isolation at DB level
- ✅ **Modern architecture** - Built on PostgreSQL, strong type system
- ✅ **Excellent migrations** - Schema versioning built-in

**Trade-offs**:
- ⚠️ Newer technology (v1.0 released 2022)
- ⚠️ Smaller community (fewer Stack Overflow answers)
- ⚠️ Learning curve for EdgeQL (new query language)

**Best if**: Team prioritizes **TypeScript DX** and **cost efficiency**, comfortable with newer tech

---

### ❌ Disqualified Options

**PostgreSQL + Apache AGE**:
- Incompatible with Supabase (AGE requires PostgreSQL 13, Supabase uses 15)
- Cannot install C extensions on managed Supabase

**DGraph**:
- Multi-tenancy is Enterprise-only feature (not available in open source)
- High resource requirements (16 vCPU recommended)

**Neo4j AuraDB**:
- Too expensive for MVP ($65+/mo vs $8-15/mo self-hosted)

---

### Final Selection: Neo4j Community Edition ✅

After evaluating both finalists, **Neo4j Community Edition (self-hosted)** selected for MVP.

**Decision Rationale**:

1. **De-risking Production** - 15+ years of production hardening beats marginal cost savings
2. **Community Support** - 1000+ Stack Overflow answers when hitting edge cases
3. **Battle-tested at Scale** - Used by eBay, Walmart, NASA, Cisco
4. **Hiring & Knowledge** - More developers know Cypher than EdgeQL
5. **Ecosystem Maturity** - More integrations, monitoring, tools available
6. **Business Confidence** - Investors/stakeholders recognize Neo4j brand

**EdgeDB Advantages Not Compelling Enough**:
- Cost savings: ~$7/mo ($84/year) - not material for business
- TypeScript DX: Nice-to-have, but Neo4j TypeScript support is also excellent
- Multi-tenancy: Both approaches work fine for MVP scale

**Trade-off Analysis**:
- Pay $7/mo more for **proven reliability** and **community support**
- Neo4j's mature ecosystem will save more than $84/year in reduced troubleshooting time
- When scaling to 100K+ nodes, battle-tested database reduces risk

**Verdict**: Neo4j is the pragmatic choice for a product that needs to scale reliably.

---

### Implementation Plan (Week 1)

**Days 2-3**: Neo4j Infrastructure Setup
- [ ] Provision Hetzner CX31 server (8GB RAM, 2 vCPU)
- [ ] Deploy Neo4j Community Edition via Docker
- [ ] Configure security (firewall, authentication)
- [ ] Set up automated backups (Hetzner volumes)
- [ ] Create staging environment

**Days 3-4**: Knowledge Graph Schema Implementation
- [ ] Define node types (ADR, PRD, ContextModule, Session, CodeFile)
- [ ] Define relationships (implements, references, mentions, etc.)
- [ ] Implement multi-tenancy via labels (`:Project_<uuid>`)
- [ ] Create TypeScript types matching graph schema
- [ ] Write schema migration script

**Days 4-5**: TypeScript Client & Basic CRUD
- [ ] Install `neo4j-driver` npm package (v5.2+)
- [ ] Create connection pool and configuration
- [ ] Implement basic CRUD operations (create, read, update, delete)
- [ ] Add tenant isolation layer (automatic label filtering)
- [ ] Write integration tests

**Day 6**: Sample Data & Query Testing
- [ ] Load sample dataset (100 nodes from existing docs)
- [ ] Implement 6 test queries from evaluation framework
- [ ] Verify query performance meets targets (<50ms p95)
- [ ] Document any optimization needed

**Day 7**: Begin GitHub OAuth (TASK-019)

---

**Status**: ✅ DECISION COMPLETE - Neo4j Community Edition Selected
**Updated**: 2025-10-27
**Owner**: Chris Norton & Claude
**Decision**: Neo4j Community Edition (self-hosted) - Proceeding to implementation
**Next Phase**: Infrastructure setup and schema implementation (Days 2-3)
