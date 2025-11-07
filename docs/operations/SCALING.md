# Scaling Guide

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Current
**Related:** [DEPLOYMENT.md](./DEPLOYMENT.md), [MONITORING.md](./MONITORING.md)

## Overview

This guide covers scaling strategies for the Ginko Cloud Knowledge Graph platform as traffic and data volumes grow.

## Current Capacity

### Baseline Configuration

**Vercel (Pro Plan):**
- Serverless functions: Auto-scaling
- Bandwidth: 100GB/month included
- Build minutes: 6000 minutes/month
- Edge Network: Global CDN

**Neo4j AuraDB (Professional):**
- RAM: 2GB
- Storage: 8GB
- Max connections: 50
- Query rate: ~1000 queries/second

**Supabase (Pro Plan):**
- Database: 8GB storage
- API requests: Unlimited
- Auth MAU: 50,000 free tier
- Storage: 100GB

### Current Usage (as of 2025-11-07)

**Traffic:**
- Requests per day: ~1,000-5,000
- Peak requests per second: ~10
- Average response time: ~100ms

**Data:**
- Knowledge nodes: ~100-500
- Relationships: ~500-2,000
- Graph size: ~50MB

**Users:**
- Monthly active users: <100
- Concurrent users: ~5-10

## Scaling Thresholds

### When to Scale

#### Application Layer (Vercel)

**Scale UP when:**
- P95 latency > 500ms consistently
- Function execution times approaching timeout (10s)
- Bandwidth approaching 80% of quota

**Action:**
- Optimize code and queries
- Add caching layer (Redis)
- Upgrade Vercel plan if needed

#### Database Layer (Neo4j)

**Scale UP when:**
- Storage > 80% used
- RAM usage > 80%
- Connection pool > 80% utilized
- Query latency > 200ms average

**Action:**
- Upgrade to larger AuraDB instance
- Add read replicas (Enterprise plan)
- Optimize queries and indexes

#### Authentication Layer (Supabase)

**Scale UP when:**
- Auth MAU > 40,000
- Database storage > 80% used
- Connection count > 80

**Action:**
- Upgrade Supabase plan
- Implement connection pooling
- Add database read replicas

## Horizontal Scaling

### Serverless Functions (Auto-scaling)

Vercel automatically scales serverless functions based on demand:

**Benefits:**
- No manual intervention
- Pay per use
- Global edge network
- Instant cold starts (<50ms)

**Limitations:**
- 10s execution timeout (Pro plan)
- 50MB deployment size limit
- No persistent connections

**Optimization:**
```javascript
// Use connection pooling for databases
import { getDriver } from '@/lib/neo4j';

export async function GET(request: Request) {
  const driver = getDriver(); // Reuses connection pool
  const session = driver.session();

  try {
    const result = await session.run('MATCH (n) RETURN n LIMIT 10');
    return Response.json(result.records);
  } finally {
    await session.close();
  }
}
```

### Read Replicas (Future)

**Neo4j AuraDB Enterprise:**
- Primary instance for writes
- Read replicas for queries
- Automatic failover
- Geographic distribution

**Implementation:**
```javascript
// Route reads to replicas
const readDriver = neo4j.driver(
  process.env.NEO4J_READ_REPLICA_URI,
  neo4j.auth.basic(user, password),
  { maxConnectionPoolSize: 50 }
);

// Route writes to primary
const writeDriver = neo4j.driver(
  process.env.NEO4J_PRIMARY_URI,
  neo4j.auth.basic(user, password),
  { maxConnectionPoolSize: 10 }
);
```

## Vertical Scaling

### Neo4j AuraDB Upgrade Path

**Current: Professional**
- RAM: 2GB
- Storage: 8GB
- Cost: ~$65/month

**Upgrade Options:**

1. **Professional Plus**
   - RAM: 4GB
   - Storage: 16GB
   - Cost: ~$130/month
   - **When:** Storage > 6GB or RAM > 1.6GB

2. **Enterprise Starter**
   - RAM: 8GB
   - Storage: 32GB
   - Cost: ~$650/month
   - **When:** Need read replicas or SLA guarantees

3. **Enterprise**
   - Custom sizing
   - Multi-region support
   - Dedicated support
   - **When:** >10,000 nodes or critical production workload

### Supabase Upgrade Path

**Current: Pro Plan**
- Database: 8GB
- API: Unlimited
- Cost: $25/month

**Upgrade Options:**

1. **Team Plan**
   - Database: 50GB
   - Priority support
   - Cost: $599/month
   - **When:** Database > 6GB or need team features

2. **Enterprise**
   - Custom resources
   - SLA guarantees
   - Dedicated support
   - **When:** >100,000 MAU or critical workload

## Caching Strategy

### Edge Caching (Vercel)

**Static assets:**
- Automatic CDN caching
- Cache-Control headers
- Immutable assets (hashed filenames)

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### API Response Caching

**Redis caching (recommended for scaling):**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function GET(request: Request) {
  const cacheKey = `nodes:${graphId}:${limit}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return Response.json(JSON.parse(cached), {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  // Query database
  const result = await queryDatabase();

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(result));

  return Response.json(result, {
    headers: { 'X-Cache': 'MISS' },
  });
}
```

### Graph Query Caching

**Neo4j query result caching:**

```cypher
// Use query hints for caching
CYPHER runtime=slotted
MATCH (n:Node)
WHERE n.status = 'active'
RETURN n
LIMIT 100
```

## Database Optimization

### Query Optimization

**Add indexes for frequently queried fields:**

```cypher
// Node type index
CREATE INDEX node_type_index IF NOT EXISTS
FOR (n:Node)
ON (n.type);

// Status index
CREATE INDEX node_status_index IF NOT EXISTS
FOR (n:Node)
ON (n.status);

// Composite index
CREATE INDEX node_type_status_index IF NOT EXISTS
FOR (n:Node)
ON (n.type, n.status);
```

**Use query profiling:**

```cypher
PROFILE
MATCH (n:Node {type: 'ADR'})
WHERE n.status = 'current'
RETURN n
LIMIT 10;
```

**Optimize vector searches:**

```cypher
// Ensure vector index exists
CALL db.index.vector.queryNodes('adr_embedding_index', 10, $embedding)
YIELD node, score
WHERE score > 0.75
RETURN node, score
LIMIT 10;
```

### Connection Pooling

**Optimize connection pool size:**

```typescript
// lib/neo4j.ts
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(user, password),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 60000, // 60s
    maxTransactionRetryTime: 30000, // 30s
    connectionTimeout: 30000, // 30s
  }
);

export { driver };
```

### Data Archival

**Archive old data to reduce query load:**

```cypher
// Move inactive nodes to archive
MATCH (n:Node)
WHERE n.status = 'archived'
  AND n.updatedAt < datetime() - duration({days: 90})
SET n:ArchivedNode
REMOVE n:Node;
```

## Performance Targets by Scale

### Small Scale (<10,000 requests/day)

**Configuration:**
- Vercel: Pro plan
- Neo4j: Professional 2GB
- Supabase: Pro plan

**Targets:**
- P95 latency: <200ms
- Throughput: 10-50 req/s
- Uptime: 99.5%

### Medium Scale (10,000-100,000 requests/day)

**Configuration:**
- Vercel: Pro plan
- Neo4j: Professional Plus 4GB
- Supabase: Pro plan
- Redis: Upstash or similar ($10/month)

**Targets:**
- P95 latency: <300ms
- Throughput: 50-200 req/s
- Uptime: 99.9%

### Large Scale (>100,000 requests/day)

**Configuration:**
- Vercel: Enterprise plan
- Neo4j: Enterprise 8GB+ with read replicas
- Supabase: Team or Enterprise plan
- Redis: Managed cluster ($100+/month)

**Targets:**
- P95 latency: <500ms
- Throughput: 200-1000 req/s
- Uptime: 99.95%

## Cost Optimization

### Strategies

1. **Use edge caching aggressively**
   - Reduce serverless function invocations
   - Lower database query load
   - Decrease bandwidth costs

2. **Optimize database queries**
   - Add proper indexes
   - Limit result sets
   - Use query profiling

3. **Implement request batching**
   - Combine multiple API calls
   - Reduce function invocations
   - Lower latency

4. **Monitor and alert on usage**
   - Set quota alerts
   - Track cost trends
   - Right-size resources

### Cost Projection

| Scale | Requests/Day | Monthly Cost | Cost/Request |
|-------|--------------|--------------|--------------|
| Small | 1,000-10,000 | $110 | $0.0003-$0.003 |
| Medium | 10,000-100,000 | $250-$400 | $0.00008-$0.0003 |
| Large | 100,000-1M | $800-$2,000 | $0.00003-$0.00008 |

**Breakdown:**
- Vercel: $20-$100/month
- Neo4j: $65-$650/month
- Supabase: $25-$599/month
- Redis: $0-$100/month
- Monitoring: $0-$50/month

## Load Testing for Scale

### Simulation Scenarios

**Small scale test:**
```bash
npm run load-test -- --concurrent=5 --requests=100
```

**Medium scale test:**
```bash
npm run load-test -- --concurrent=50 --requests=1000
```

**Large scale test:**
```bash
npm run load-test -- --concurrent=200 --requests=10000
```

### Stress Testing

**Find breaking point:**
```bash
# Gradually increase load until failure
for i in 10 20 50 100 200 500; do
  echo "Testing with $i concurrent requests"
  npm run load-test -- --concurrent=$i --requests=1000
  sleep 60
done
```

### Capacity Planning

**Calculate capacity:**
1. Measure current performance (requests/second)
2. Determine target growth (2x, 5x, 10x)
3. Estimate required resources
4. Test at target load
5. Add 20% buffer

**Example:**
- Current: 10 req/s
- Target: 100 req/s (10x growth)
- Test at: 120 req/s (with buffer)
- If successful: Current config sufficient
- If failed: Scale up resources

## Disaster Recovery

### Backup Strategy

**Neo4j:**
- Automatic daily backups (AuraDB)
- Point-in-time recovery (Enterprise)
- Manual export via CSV/JSON

**Supabase:**
- Automatic daily backups (Pro plan)
- Point-in-time recovery (up to 7 days)
- Manual database dumps

### Recovery Procedures

**Database corruption:**
1. Stop writes immediately
2. Assess data integrity
3. Restore from latest backup
4. Verify data consistency
5. Resume operations

**Service outage:**
1. Check provider status pages
2. Switch to backup region (if available)
3. Communicate with users
4. Monitor recovery
5. Post-incident review

## References

- [Vercel Scaling Guide](https://vercel.com/docs/concepts/limits/overview)
- [Neo4j Performance Tuning](https://neo4j.com/docs/operations-manual/current/performance/)
- [Supabase Scaling Documentation](https://supabase.com/docs/guides/platform/compute-add-ons)

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-07 | 1.0 | Initial scaling guide |

---

**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
**Next Review:** 2026-02-07
