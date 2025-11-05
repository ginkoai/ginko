# ADR-044: Migrate to Neo4j AuraDB Free Tier for Production Deployment

**Status**: Accepted
**Date**: 2025-11-05
**Deciders**: Chris Norton, Claude Code
**Tags**: infrastructure, database, saas, cost-optimization

---

## Context and Problem Statement

Ginko requires a production-ready Neo4j graph database to power its knowledge graph and event stream features (ADR-043). The current deployment uses a self-hosted Neo4j instance on Hetzner VPS, which presents several challenges:

1. **Vercel Connectivity**: Serverless functions cannot connect to the Hetzner instance due to:
   - Dynamic IP addresses from Vercel (no fixed IPs without Pro plan)
   - Firewall restrictions requiring IP whitelisting
   - Additional complexity and cost to resolve ($20/mo for Vercel Static IPs or $10/mo for Fixie proxy)

2. **SaaS Economics**: As Ginko transitions to a SaaS platform, infrastructure costs and scalability become critical:
   - Need to maximize runway with minimal infrastructure costs
   - Must support multi-tenant usage patterns (50 events/developer/day)
   - Capacity planning for 0-100+ users

3. **Operational Overhead**: Self-hosted requires:
   - Manual backups and disaster recovery
   - Security updates and patching
   - Monitoring and alerting setup
   - Server maintenance

4. **Event Data Growth**: Session events accumulate rapidly but have declining value over time:
   - Events older than 90 days provide minimal context value
   - Linear growth would exhaust any fixed capacity limit
   - Need intelligent lifecycle management

## Decision

**Migrate to Neo4j AuraDB Free Tier with Event Lifecycle Management**

We will:
1. Migrate from self-hosted Hetzner Neo4j to Neo4j AuraDB Free Tier
2. Implement a three-phase event lifecycle system (Synthesize → Archive → Prune)
3. Configure automated lifecycle management via GitHub Actions

## Rationale

### Technical Benefits

**Immediate Connectivity**
- AuraDB is accessible from Vercel without IP whitelisting
- Eliminates $20-30/month firewall workaround costs
- Production-ready SSL/TLS by default

**Managed Infrastructure**
- Automated backups and point-in-time recovery
- Automatic security updates and patches
- Built-in monitoring and alerting
- 99.95% SLA (Professional tier and above)

**Performance**
- Global CDN distribution
- Optimized for cloud workloads
- Auto-scaling capabilities (paid tiers)

### Economic Analysis

#### Capacity Without Lifecycle Management (Linear Growth)

| Users | Time to 200K Limit | Monthly Cost | Status |
|-------|-------------------|--------------|--------|
| 1 | 91 months | $0 (free tier) | ✓ Viable |
| 5 | 19 months | $0 → $65 | ⚠️ Early upgrade |
| 10 | **10 months** | $0 → $65 | ❌ Unsustainable |
| 20 | **5 months** | $0 → $65 | ❌ Unsustainable |
| 50 | **2 months** | $0 → $65 | ❌ Unsustainable |

**Problem**: Forces $65/month Pro upgrade when MRR is only $50-200/month, killing profitability.

#### Capacity With Event Lifecycle Management (Steady State)

| Users | Capacity Used | Status | MRR (@$10/user) |
|-------|--------------|--------|-----------------|
| 1 | 2.35% | ✓ Free tier | $10 |
| 5 | 11.56% | ✓ Free tier | $50 |
| 10 | 23.08% | ✓ Free tier | $100 |
| 20 | 46.10% | ✓ Free tier | $200 |
| **43** | **99.06%** | **✓ Free tier** | **$430** |
| 44+ | >100% | Upgrade to Pro ($65/mo) | $440+ |

**Solution**: Maintain **$430 MRR on $0 infrastructure**, then upgrade when profitable.

### Break-Even Analysis

At **$10/user/month** pricing:

| Milestone | Users | MRR | Infrastructure Cost | Net Profit | Margin |
|-----------|-------|-----|---------------------|------------|--------|
| Launch | 1-6 | $10-60 | $0 | $10-60 | 100% |
| **Break-even** | **7** | **$70** | **$65** | **$5** | **7%** |
| Free tier max | 43 | $430 | $0 | $430 | 100% |
| Pro required | 44+ | $440+ | $65 | $375+ | 85%+ |

**Key Insight**: Event lifecycle extends free tier capacity by **4.3x** (from 10 users to 43 users), allowing $430 MRR before any infrastructure costs.

### Event Lifecycle Strategy

The lifecycle system maintains steady-state capacity by managing event data through three phases:

**Phase 1: Synthesis (30-day threshold)**
- Extract recurring patterns → Pattern nodes
- Capture high-value insights → Gotcha nodes
- Aggregate achievements → Context Module nodes
- **Result**: Preserve knowledge, mark events as synthesized

**Phase 2: Archive (30-day threshold)**
- Export events to `.ginko/archives/events/YYYY-MM/`
- JSON format (~500 bytes/event)
- Git-trackable history
- **Result**: Zero data loss, full audit trail

**Phase 3: Pruning (90-day threshold)**
- Delete archived & synthesized events
- Preserve temporal chain integrity
- Log all pruning operations
- **Result**: Free graph capacity, maintain performance

#### Steady-State Capacity Model

With 90-day retention:
```
Events per developer per day: 50
Developers: 43 (max in free tier)
Daily events: 2,150
Events in graph: 193,500 (90-day window)
Permanent context: 4,615 nodes
Total capacity: 99.06%
```

**Archive Growth**: 2.7 MB/year (negligible disk space)

**Sustainability**: Steady state maintained indefinitely - free tier never exhausted.

## Consequences

### Positive

✅ **Zero Infrastructure Costs** up to 43 users ($430 MRR)
✅ **Eliminates Vercel Connectivity Issues** - works out of the box
✅ **Automated Backups & DR** - managed by Neo4j
✅ **Infinite Free Tier Capacity** - via event lifecycle
✅ **No Operational Overhead** - fully managed service
✅ **Production-Ready Security** - SSL/TLS, compliance
✅ **Knowledge Preservation** - synthesis before pruning
✅ **Full Audit Trail** - archived event history

### Negative

⚠️ **Auto-Pause After 3 Days** - resumes in seconds on first query
⚠️ **Deleted After 30 Days Inactive** - acceptable for SaaS (users active or churned)
⚠️ **Single Database Limit** - sufficient for MVP, revisit at scale
⚠️ **Complexity Added** - event lifecycle automation required

### Neutral

ℹ️ **Vendor Lock-in Risk** - mitigated by standard Cypher queries, exportable data
ℹ️ **Event Lifecycle Dependency** - required for sustainability but provides value (synthesis)

## Implementation

See `scripts/event-lifecycle-manager.ts` for full implementation.

**Migration Steps**:
1. Create Neo4j AuraDB Free instance
2. Export data from Hetzner (118 nodes, 1,069 relationships)
3. Import to AuraDB via console
4. Update Vercel environment variables
5. Deploy and test connectivity
6. Set up weekly lifecycle automation (GitHub Actions)
7. Decommission Hetzner after 7-day validation

**Timeline**: 1-2 days for migration, 7 days validation period

## Alternatives Considered

### Alternative 1: Keep Hetzner + Vercel Static IPs
**Cost**: $20/month
**Decision**: Rejected - Higher cost, operational overhead remains

### Alternative 2: Fixie Proxy Service
**Cost**: ~$10/month
**Decision**: Rejected - Adds complexity without solving capacity planning

### Alternative 3: AuraDB Professional from Day 1
**Cost**: $65/month
**Decision**: Rejected - Unsustainable pre-revenue ($65 vs $0-50 MRR)

### Alternative 4: Build Custom Event Storage
**Decision**: Rejected - Not core competency, loses graph capabilities

## Related Decisions

- ADR-002: AI-Optimized File Discovery
- ADR-033: Context Pressure Mitigation Strategy (session logging)
- ADR-043: Event-Based Context Loading (event stream model)

## References

- [Neo4j AuraDB Free Tier](https://neo4j.com/cloud/platform/aura-graph-database/)
- [Event Lifecycle Implementation](../../scripts/event-lifecycle-manager.ts)
- [Capacity Analysis](../../scripts/prune-events.ts)
- Current instance: Hetzner VPS at 178.156.182.99:7687 (neo4j/Palindrome000)

---

**Status**: Ready for implementation
**Risk Level**: Low - reversible within 7 days, Hetzner remains as fallback
