# Neo4j Local Development Setup

Quick guide to running Neo4j locally for Ginko knowledge graph development.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2+ (included with Docker Desktop)

## Quick Start

### 1. Start Neo4j

```bash
# From project root
docker-compose up -d neo4j

# Check logs
docker-compose logs -f neo4j

# Wait for "Started." message (takes ~30 seconds)
```

### 2. Access Neo4j Browser

Open browser to: **http://localhost:7474**

**Login credentials**:
- Username: `neo4j`
- Password: `devpassword123` (from .env file)

### 3. Verify Installation

In Neo4j Browser, run:

```cypher
// Should return version 5.15
CALL dbms.components() YIELD name, versions
RETURN name, versions[0] as version;
```

## Configuration

### Memory Settings

Default configuration (in `docker-compose.yml`):
- Heap: 512MB initial, 2GB max
- Page cache: 1GB

**Adjust for your machine**:
- 8GB RAM → Keep defaults
- 16GB RAM → Increase heap to 4GB, page cache to 2GB
- 32GB RAM → Increase heap to 8GB, page cache to 4GB

Edit `docker-compose.yml`:
```yaml
- NEO4J_server_memory_heap_max__size=4G
- NEO4J_server_memory_pagecache_size=2G
```

### Change Password

**Option 1**: Edit `.env` file
```bash
NEO4J_PASSWORD=your-secure-password
```

**Option 2**: Set environment variable
```bash
export NEO4J_PASSWORD=your-secure-password
docker-compose up -d neo4j
```

## Common Commands

```bash
# Start Neo4j
docker-compose up -d neo4j

# Stop Neo4j
docker-compose stop neo4j

# Restart Neo4j
docker-compose restart neo4j

# View logs
docker-compose logs -f neo4j

# Stop and remove containers + volumes (⚠️ deletes all data)
docker-compose down -v

# Stop but keep data
docker-compose down
```

## Data Persistence

Data is stored in Docker volumes:
- `neo4j_data` - Graph database files
- `neo4j_logs` - Application logs
- `neo4j_import` - CSV import directory
- `neo4j_plugins` - APOC and other plugins

**Location**:
- Mac: `~/Library/Containers/com.docker.docker/Data/vms/0/`
- Linux: `/var/lib/docker/volumes/`

**To backup**:
```bash
# Export database
docker exec ginko-neo4j-dev neo4j-admin database dump neo4j --to-path=/var/lib/neo4j/import

# Copy to host
docker cp ginko-neo4j-dev:/var/lib/neo4j/import/neo4j.dump ./neo4j-backup.dump
```

## Connecting from TypeScript

```typescript
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'devpassword123'
  )
);

const session = driver.session();

try {
  const result = await session.run(
    'MATCH (n) RETURN count(n) as count'
  );
  console.log('Node count:', result.records[0].get('count'));
} finally {
  await session.close();
}

await driver.close();
```

## APOC Plugin

APOC (Awesome Procedures On Cypher) is pre-installed for advanced graph operations:
- Graph algorithms
- Data import/export
- Text search
- Date/time utilities

**Example usage**:
```cypher
// Shortest path between nodes
MATCH (start:ADR {id: 'ADR-001'}), (end:PRD {id: 'PRD-001'})
CALL apoc.algo.dijkstra(start, end, 'IMPLEMENTS', 'weight')
YIELD path, weight
RETURN path, weight;
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs neo4j

# Common issue: port 7474 or 7687 already in use
lsof -i :7474
lsof -i :7687
```

### Can't connect from TypeScript

1. Verify Neo4j is running: `docker-compose ps`
2. Check `.env` has correct credentials
3. Test connection in Neo4j Browser first
4. Verify firewall isn't blocking ports

### Performance is slow

1. Increase memory allocation (see Configuration above)
2. Check Docker Desktop resource limits (Preferences → Resources)
3. Close other heavy applications

### Reset database

```bash
# ⚠️ Deletes ALL data
docker-compose down -v
docker-compose up -d neo4j
```

## Production Deployment

When ready to deploy to Hetzner:

1. Use same `docker-compose.yml` with production values
2. Change `NEO4J_PASSWORD` to strong password
3. Configure firewall (only allow specific IPs)
4. Enable SSL/TLS for Bolt connections
5. Set up automated backups (daily snapshots)
6. Monitor memory usage and adjust heap/page cache

See `docs/infrastructure/neo4j-production-deployment.md` for full guide.

---

**Next Steps**:
1. Start Neo4j: `docker-compose up -d neo4j`
2. Define knowledge graph schema: `docs/infrastructure/neo4j-schema.md`
3. Implement TypeScript client: `src/graph/neo4j-client.ts`
